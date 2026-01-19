'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { format, isSameDay, addDays, parseISO, isAfter, startOfWeek, endOfWeek, isWithinInterval, startOfMonth } from 'date-fns';
import { Plus, Trash2, Clock, Calendar, LayoutList, CalendarRange } from 'lucide-react';
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
  type: 'Quiz' | 'Midsem' | 'Lab' | 'Deadline' | 'Compre' | 'Personal';
  isPersonal?: boolean;
};

export default function Home() {
  const [masterEvals, setMasterEvals] = useState<EvalEvent[]>([]);
  const [personalEvals, setPersonalEvals] = useState<EvalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
  // Form State
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

  // 1. DAILY VIEW LOGIC
  const tomorrow = addDays(today, 1);
  const todayEvals = allEvals.filter((e) => isSameDay(parseISO(e.event_date), today));
  const tomorrowEvals = allEvals.filter((e) => isSameDay(parseISO(e.event_date), tomorrow));
  const upcomingEvals = allEvals.filter((e) => {
    const date = parseISO(e.event_date);
    return isAfter(date, tomorrow) && isAfter(addDays(today, 14), date);
  });

  // 2. WEEKLY VIEW LOGIC
  const getWeeklyGroups = () => {
    const groups: { label: string; evals: EvalEvent[] }[] = [];
    // Look at next 4 weeks
    for (let i = 0; i < 4; i++) {
        const weekStart = addDays(startOfWeek(today), i * 7);
        const weekEnd = endOfWeek(weekStart);
        
        const evalsInWeek = allEvals.filter(e => 
            isWithinInterval(parseISO(e.event_date), { start: weekStart, end: weekEnd })
        );

        if (evalsInWeek.length > 0) {
            groups.push({
                label: i === 0 ? 'THIS WEEK' : `WEEK OF ${format(weekStart, 'd MMM').toUpperCase()}`,
                evals: evalsInWeek
            });
        }
    }
    return groups;
  };

  // 3. MONTHLY VIEW LOGIC
  const getMonthlyGroups = () => {
      const groups: { [key: string]: EvalEvent[] } = {};
      allEvals.forEach(e => {
          const month = format(parseISO(e.event_date), 'MMMM'); // e.g., "January"
          if (!groups[month]) groups[month] = [];
          groups[month].push(e);
      });
      return Object.entries(groups).map(([month, evals]) => ({ label: month.toUpperCase(), evals }));
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white tracking-widest uppercase text-xs">Loading Focus...</div>;

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black pb-32">
      <div className="max-w-md mx-auto min-h-screen p-6 relative flex flex-col">
        
        {/* HEADER */}
        <header className="mt-8 mb-12">
          <div className="mb-10 flex justify-between items-end border-b border-neutral-800 pb-6">
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-white">Focus.</h1>
              <p className="text-neutral-500 text-[10px] font-bold tracking-[0.2em] uppercase mt-1">2-2 CS Eval Tracker</p>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Live</span>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={viewMode}>
            <p className="text-neutral-500 font-bold tracking-widest text-xs uppercase mb-2">
              {viewMode === 'daily' ? format(today, 'EEEE').toUpperCase() : viewMode === 'weekly' ? 'WEEKLY OVERVIEW' : 'SEMESTER PLAN'}
            </p>
            <h1 className="text-6xl font-black tracking-tighter leading-none text-white">
              {viewMode === 'daily' ? format(today, 'd MMM').toUpperCase() : viewMode === 'weekly' ? 'THIS WEEK' : format(today, 'MMM').toUpperCase()}
            </h1>
            <div className="h-1 w-20 bg-white mt-6"></div>
          </motion.div>
        </header>

        {/* CONTENT AREA */}
        <div className="space-y-12">
            
            {/* DAILY VIEW */}
            {viewMode === 'daily' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                    <Section label="TODAY" evals={todayEvals} onDelete={deletePersonalEval} />
                    <Section label="TOMORROW" evals={tomorrowEvals} onDelete={deletePersonalEval} />
                    <Section label="UPCOMING" evals={upcomingEvals} onDelete={deletePersonalEval} />
                </motion.div>
            )}

            {/* WEEKLY VIEW */}
            {viewMode === 'weekly' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                    {getWeeklyGroups().map((group, idx) => (
                        <Section key={idx} label={group.label} evals={group.evals} onDelete={deletePersonalEval} showDate />
                    ))}
                </motion.div>
            )}

            {/* MONTHLY VIEW */}
            {viewMode === 'monthly' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                    {getMonthlyGroups().map((group, idx) => (
                        <Section key={idx} label={group.label} evals={group.evals} onDelete={deletePersonalEval} showDate />
                    ))}
                </motion.div>
            )}

        </div>

        {/* CREDIT FOOTER */}
        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="pt-20 pb-32 text-center"
        >
          <div className="flex flex-col items-center justify-center gap-2 opacity-30 hover:opacity-100 transition-opacity duration-300">
            <div className="w-8 h-8 border border-white rounded-full flex items-center justify-center mb-2">
               <span className="text-[10px] font-bold">TS</span>
            </div>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white">
              Tanishq Sahu
            </p>
            <p className="text-[9px] text-neutral-500 tracking-widest uppercase">
              BITS Goa
            </p>
          </div>
        </motion.footer>

        {/* BOTTOM DOCK (NAVIGATION + FAB) */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-40">
            
            {/* View Switcher Pill */}
            <div className="bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-full p-1.5 flex gap-1 shadow-2xl">
                <button 
                    onClick={() => setViewMode('daily')}
                    className={`px-4 py-3 rounded-full flex items-center gap-2 transition-all ${viewMode === 'daily' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}
                >
                    <LayoutList size={18} />
                    {viewMode === 'daily' && <span className="text-xs font-bold uppercase">Daily</span>}
                </button>
                <button 
                    onClick={() => setViewMode('weekly')}
                    className={`px-4 py-3 rounded-full flex items-center gap-2 transition-all ${viewMode === 'weekly' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}
                >
                    <CalendarRange size={18} />
                    {viewMode === 'weekly' && <span className="text-xs font-bold uppercase">Weekly</span>}
                </button>
                <button 
                    onClick={() => setViewMode('monthly')}
                    className={`px-4 py-3 rounded-full flex items-center gap-2 transition-all ${viewMode === 'monthly' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}
                >
                    <Calendar size={18} />
                    {viewMode === 'monthly' && <span className="text-xs font-bold uppercase">Month</span>}
                </button>
            </div>

            {/* Floating Add Button */}
            <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsFormOpen(true)}
                className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center shadow-xl border-4 border-black"
            >
                <Plus size={24} strokeWidth={3} />
            </motion.button>
        </div>

        {/* MODAL (Unchanged) */}
        <AnimatePresence>
          {isFormOpen && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-4 z-50"
            >
              <motion.div 
                initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
                className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl w-full max-w-sm"
              >
                <h3 className="text-xl font-bold mb-6 text-white tracking-tight">NEW TASK</h3>
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Task Name"
                  className="w-full bg-black border-b-2 border-neutral-700 p-3 mb-4 text-white placeholder:text-neutral-600 focus:outline-none focus:border-white transition-colors text-lg font-medium"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                />
                 <input 
                  type="text" 
                  placeholder="Time (e.g. 2 PM)"
                  className="w-full bg-black border-b-2 border-neutral-700 p-3 mb-8 text-white placeholder:text-neutral-600 focus:outline-none focus:border-white transition-colors"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                />
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
          <div key={e.id} className="group relative bg-neutral-900 border border-neutral-800 hover:border-neutral-600 transition-colors p-5 rounded-lg">
            
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider border border-neutral-700 px-2 py-1 rounded text-neutral-400">
                {e.type}
              </span>
              
              <div className="flex flex-col items-end">
                {e.time_range && (
                    <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
                    <Clock size={12} />
                    <span className="text-xs font-medium tracking-wide">{e.time_range}</span>
                    </div>
                )}
                {/* Show Date in List view only */}
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

              {e.isPersonal && (
                <button onClick={() => onDelete(e.id)} className="text-neutral-600 hover:text-white transition-colors">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}