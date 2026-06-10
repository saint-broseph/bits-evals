'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { format, isSameDay, addDays, parseISO, isAfter, startOfWeek, endOfWeek, isWithinInterval, addWeeks, startOfMonth, getMonth } from 'date-fns';
import { Plus, Trash2, Clock, Calendar, LayoutList, CalendarRange, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- CONFIGURATION ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type EvalEvent = {
  id: string | number;
  title: string;
  event_date: string;
  time_range?: string;
  description?: string; // New field
  type: 'Quiz' | 'Midsem' | 'Lab' | 'Deadline' | 'Compre' | 'Personal';
  isPersonal?: boolean;
};

export default function Home() {
  const [masterEvals, setMasterEvals] = useState<EvalEvent[]>([]);
  const [personalEvals, setPersonalEvals] = useState<EvalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // VIEW STATES
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, 1 = next week
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'MMM').toUpperCase()); // Default to current month

  // FORM STATE
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // --- DATA FETCHING ---
  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from('evals')
        .select('*')
        .gte('event_date', format(new Date(), 'yyyy-MM-dd'))
        .order('event_date', { ascending: true });

      if (data) setMasterEvals(data as any);

      const stored = localStorage.getItem('personalEvals');
      if (stored) setPersonalEvals(JSON.parse(stored));
      
      setLoading(false);
    }
    fetchData();
  }, []);

  // --- ACTIONS ---
  const addPersonalEval = () => {
    if (!newEventTitle) return;
    
    const newEval: EvalEvent = {
      id: Date.now(),
      title: newEventTitle,
      event_date: format(new Date(), 'yyyy-MM-dd'),
      time_range: newEventTime || 'All Day',
      type: 'Personal',
      isPersonal: true,
      description: 'Personal Task',
    };

    const updated = [...personalEvals, newEval];
    setPersonalEvals(updated);
    localStorage.setItem('personalEvals', JSON.stringify(updated));
    setNewEventTitle('');
    setNewEventTime('');
    setIsFormOpen(false);
  };

  const deletePersonalEval = (id: string | number) => {
    const updated = personalEvals.filter((e) => e.id !== id);
    setPersonalEvals(updated);
    localStorage.setItem('personalEvals', JSON.stringify(updated));
  };

  // --- VIEW LOGIC ---
  const today = new Date();
  const allEvals = [...masterEvals, ...personalEvals].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

  // 1. DAILY LOGIC
  const tomorrow = addDays(today, 1);
  const todayEvals = allEvals.filter((e) => isSameDay(parseISO(e.event_date), today));
  const tomorrowEvals = allEvals.filter((e) => isSameDay(parseISO(e.event_date), tomorrow));
  const upcomingEvals = allEvals.filter((e) => {
    const date = parseISO(e.event_date);
    return isAfter(date, tomorrow) && isAfter(addDays(today, 14), date);
  });

  // 2. WEEKLY LOGIC (Pagination)
  const currentWeekStart = addWeeks(startOfWeek(today), weekOffset);
  const currentWeekEnd = endOfWeek(currentWeekStart);
  const weeklyEvals = allEvals.filter(e => 
    isWithinInterval(parseISO(e.event_date), { start: currentWeekStart, end: currentWeekEnd })
  );

  // 3. MONTHLY LOGIC (Tabs)
  const monthlyEvals = allEvals.filter(e => 
    format(parseISO(e.event_date), 'MMM').toUpperCase() === selectedMonth
  );
  const monthTabs = ['JAN', 'FEB', 'MAR', 'APR', 'MAY'];

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white tracking-widest uppercase text-xs">Loading Focus...</div>;

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black pb-40">
      <div className="max-w-md mx-auto min-h-screen p-6 relative flex flex-col">
        
        {/* HEADER */}
        <header className="mt-8 mb-8">
          <div className="mb-8 flex justify-between items-end border-b border-neutral-800 pb-6">
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-white">Focus.</h1>
              <p className="text-neutral-500 text-[10px] font-bold tracking-[0.2em] uppercase mt-1">2-2 PHOENIX Eval Tracker</p>
            </div>
            <div className="group flex items-center gap-2 mb-1 cursor-default">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse group-hover:bg-emerald-500 transition-colors"></div>
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider group-hover:text-white transition-colors">
                <span className="group-hover:hidden">Live</span>
                <span className="hidden group-hover:inline">Engineered by Tanishq</span>
              </span>
            </div>
          </div>

          {/* DYNAMIC HEADER CONTENT */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={viewMode + selectedMonth + weekOffset}>
            
            {/* DAILY HEADER */}
            {viewMode === 'daily' && (
              <>
                <p className="text-neutral-500 font-bold tracking-widest text-xs uppercase mb-2">{format(today, 'EEEE').toUpperCase()}</p>
                <h1 className="text-6xl font-black tracking-tighter leading-none text-white">{format(today, 'd MMM').toUpperCase()}</h1>
              </>
            )}

            {/* WEEKLY HEADER */}
            {viewMode === 'weekly' && (
              <>
                 <p className="text-neutral-500 font-bold tracking-widest text-xs uppercase mb-2">WEEKLY VIEW</p>
                 <div className="flex items-center justify-between">
                    <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-2 border border-neutral-800 rounded-full hover:bg-neutral-900"><ChevronLeft size={20} /></button>
                    <div className="text-center">
                        <h1 className="text-xl font-bold tracking-tight text-white">{format(currentWeekStart, 'd MMM').toUpperCase()} - {format(currentWeekEnd, 'd MMM').toUpperCase()}</h1>
                        {weekOffset === 0 && <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Current Week</span>}
                    </div>
                    <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-2 border border-neutral-800 rounded-full hover:bg-neutral-900"><ChevronRight size={20} /></button>
                 </div>
              </>
            )}

            {/* MONTHLY HEADER (TABS) */}
            {viewMode === 'monthly' && (
              <>
                <p className="text-neutral-500 font-bold tracking-widest text-xs uppercase mb-4">SEMESTER VIEW</p>
                <div className="flex justify-between items-center border-b border-neutral-800 pb-2 overflow-x-auto no-scrollbar gap-4">
                  {monthTabs.map((m) => (
                    <button 
                      key={m}
                      onClick={() => setSelectedMonth(m)}
                      className={`text-4xl font-black tracking-tighter transition-colors ${selectedMonth === m ? 'text-white' : 'text-neutral-800 hover:text-neutral-600'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="h-1 w-20 bg-white mt-6"></div>
          </motion.div>
        </header>

        {/* CONTENT AREA */}
        <div className="space-y-12">
            
            {/* DAILY VIEW */}
            {viewMode === 'daily' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Section label="TODAY" evals={todayEvals} onDelete={deletePersonalEval} />
                    <Section label="TOMORROW" evals={tomorrowEvals} onDelete={deletePersonalEval} />
                    {/* FIXED: Passed showDate={true} here */}
                    <Section label="UPCOMING" evals={upcomingEvals} onDelete={deletePersonalEval} showDate={true} />
                </motion.div>
            )}

            {/* WEEKLY VIEW (Single Page) */}
            {viewMode === 'weekly' && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} key={weekOffset}>
                     <Section label={`EVENTS`} evals={weeklyEvals} onDelete={deletePersonalEval} showDate={true} />
                     {weeklyEvals.length === 0 && <div className="text-neutral-600 italic mt-4">No academic events scheduled for this week.</div>}
                </motion.div>
            )}

            {/* MONTHLY VIEW (Tabbed) */}
            {viewMode === 'monthly' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key={selectedMonth}>
                    <Section label={`${selectedMonth} SCHEDULE`} evals={monthlyEvals} onDelete={deletePersonalEval} showDate={true} />
                    {monthlyEvals.length === 0 && <div className="text-neutral-600 italic mt-4">No events scheduled for {selectedMonth}.</div>}
                </motion.div>
            )}

        </div>

        {/* CREDIT FOOTER */}
        <motion.footer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="pt-20 pb-10 text-center">
          <div className="flex flex-col items-center justify-center gap-2 opacity-30 hover:opacity-100 transition-opacity duration-300">
            <div className="w-8 h-8 border border-white rounded-full flex items-center justify-center mb-2">
               <span className="text-[10px] font-bold">TS</span>
            </div>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white">Tanishq Sahu</p>
            <p className="text-[9px] text-neutral-500 tracking-widest uppercase">BITS Goa</p>
          </div>
        </motion.footer>

        {/* BOTTOM DOCK */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-40 w-full justify-center pointer-events-none">
            <div className="pointer-events-auto bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-full p-1.5 flex gap-1 shadow-2xl">
                <NavButton icon={<LayoutList size={18} />} label="Daily" active={viewMode === 'daily'} onClick={() => setViewMode('daily')} />
                <NavButton icon={<CalendarRange size={18} />} label="Weekly" active={viewMode === 'weekly'} onClick={() => { setViewMode('weekly'); setWeekOffset(0); }} />
                <NavButton icon={<Calendar size={18} />} label="Monthly" active={viewMode === 'monthly'} onClick={() => setViewMode('monthly')} />
            </div>

            <motion.button 
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsFormOpen(true)}
                className="pointer-events-auto w-14 h-14 bg-white text-black rounded-full flex items-center justify-center shadow-xl border-4 border-black"
            >
                <Plus size={24} strokeWidth={3} />
            </motion.button>
        </div>

        {/* MODAL */}
        <AnimatePresence>
          {isFormOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-4 z-50">
              <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl w-full max-w-sm">
                <h3 className="text-xl font-bold mb-6 text-white tracking-tight">NEW TASK</h3>
                <input autoFocus type="text" placeholder="Task Name" className="w-full bg-black border-b-2 border-neutral-700 p-3 mb-4 text-white focus:outline-none focus:border-white transition-colors text-lg font-medium" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)}/>
                 <input type="text" placeholder="Time (e.g. 2 PM)" className="w-full bg-black border-b-2 border-neutral-700 p-3 mb-8 text-white focus:outline-none focus:border-white transition-colors" value={newEventTime} onChange={(e) => setNewEventTime(e.target.value)}/>
                <div className="flex gap-4">
                  <button onClick={() => setIsFormOpen(false)} className="flex-1 py-4 rounded-lg text-neutral-500 font-bold hover:text-white transition-colors">CANCEL</button>
                  <button onClick={addPersonalEval} className="flex-1 py-4 bg-white text-black rounded-lg font-bold hover:bg-neutral-200 transition-colors">ADD</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

// --- SUB-COMPONENTS ---

function NavButton({ icon, label, active, onClick }: any) {
    return (
        <button onClick={onClick} className={`px-4 py-3 rounded-full flex items-center gap-2 transition-all duration-300 ${active ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}>
            {icon}
            {active && <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} className="text-xs font-bold uppercase whitespace-nowrap overflow-hidden">{label}</motion.span>}
        </button>
    );
}

function Section({ label, evals, onDelete, showDate = false }: any) {
  if (evals.length === 0 && label === 'TODAY') return (
    <div className="mb-8">
       <h2 className="text-xs font-bold text-neutral-600 tracking-widest mb-4 uppercase">{label}</h2>
       <p className="text-neutral-700 italic border-l-2 border-neutral-800 pl-4 py-2">No tasks. Stay focused.</p>
    </div>
  );
  if (evals.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-xs font-bold text-neutral-500 tracking-widest mb-4 uppercase flex items-center gap-2">
        {label}
        <div className="h-[1px] flex-1 bg-neutral-800"></div>
      </h2>
      <div className="space-y-3">
        {evals.map((e: EvalEvent) => (
          <EvalCard key={e.id} event={e} onDelete={onDelete} showDate={showDate} />
        ))}
      </div>
    </section>
  );
}

// Separate component to handle Expand/Collapse state individually
function EvalCard({ event: e, onDelete, showDate }: any) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <motion.div 
            layout 
            onClick={() => setIsExpanded(!isExpanded)}
            className="group relative bg-neutral-900 border border-neutral-800 hover:border-neutral-600 transition-colors p-5 rounded-lg cursor-pointer overflow-hidden"
        >
            <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider border px-2 py-1 rounded ${e.isPersonal ? 'border-neutral-700 text-neutral-400' : 'border-white/20 text-white'}`}>
                    {e.type}
                </span>
                
                <div className="flex flex-col items-end">
                    {e.time_range && (
                        <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
                            <Clock size={12} />
                            <span className="text-xs font-medium tracking-wide">{e.time_range}</span>
                        </div>
                    )}
                    {showDate && (
                        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                            {format(parseISO(e.event_date), 'd MMM')}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex justify-between items-end">
                <div>
                    <h3 className="text-xl font-bold text-white leading-tight">{e.title}</h3>
                </div>
                
                {e.isPersonal ? (
                     <button onClick={(event) => { event.stopPropagation(); onDelete(e.id); }} className="text-neutral-600 hover:text-red-500 transition-colors p-2">
                        <Trash2 size={16} />
                     </button>
                ) : (
                    // Show Info Icon if there is a description
                    e.description && (
                        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDown size={16} className="text-neutral-500" />
                        </div>
                    )
                )}
            </div>

            {/* EXPANDABLE DESCRIPTION */}
            <AnimatePresence>
                {isExpanded && e.description && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: 'auto', opacity: 1 }} 
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-4 mt-4 border-t border-neutral-800">
                            <p className="text-sm text-neutral-400 leading-relaxed font-medium">
                                {e.description}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}