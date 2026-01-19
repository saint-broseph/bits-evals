'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { format, isSameDay, addDays, parseISO, isAfter } from 'date-fns';
import { Plus, Trash2, Clock, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // Animation Library

// --- CONFIGURATION ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type EvalEvent = {
  id: string | number;
  title: string;
  event_date: string;
  time_range?: string; // New field
  type: 'Quiz' | 'Midsem' | 'Lab' | 'Deadline' | 'Compre' | 'Personal';
  isPersonal?: boolean;
};

export default function Home() {
  const [masterEvals, setMasterEvals] = useState<EvalEvent[]>([]);
  const [personalEvals, setPersonalEvals] = useState<EvalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  // --- LOGIC ---
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const allEvals = [...masterEvals, ...personalEvals];
  
  const todayEvals = allEvals.filter((e) => isSameDay(parseISO(e.event_date), today));
  const tomorrowEvals = allEvals.filter((e) => isSameDay(parseISO(e.event_date), tomorrow));
  const upcomingEvals = allEvals.filter((e) => {
    const date = parseISO(e.event_date);
    return isAfter(date, tomorrow) && isAfter(addDays(today, 14), date);
  });

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white tracking-widest uppercase text-xs">Loading Focus...</div>;

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
      <div className="max-w-md mx-auto min-h-screen p-6 relative flex flex-col">
        
        {/* HEADER SECTION */}
        <header className="mt-8 mb-12">
          
          {/* 1. BRANDING (Restored) */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 flex justify-between items-end border-b border-neutral-800 pb-6"
          >
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-white">Focus.</h1>
              <p className="text-neutral-500 text-[10px] font-bold tracking-[0.2em] uppercase mt-1">
                2-2 CS Eval Tracker
              </p>
            </div>
            {/* Optional: Small 'Live' indicator */}
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Live</span>
            </div>
          </motion.div>

          {/* 2. THE BOLD DATE (Existing) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <p className="text-neutral-500 font-bold tracking-widest text-xs uppercase mb-2">
              {format(today, 'EEEE').toUpperCase()}
            </p>
            <h1 className="text-7xl font-black tracking-tighter leading-none text-white">
              {format(today, 'd MMM').toUpperCase()}
            </h1>
            <div className="h-1 w-20 bg-white mt-6"></div>
          </motion.div>
        </header>

        {/* SECTIONS */}
        <div className="space-y-12">
          <Section label="TODAY" evals={todayEvals} onDelete={deletePersonalEval} delay={0.1} />
          <Section label="TOMORROW" evals={tomorrowEvals} onDelete={deletePersonalEval} delay={0.2} />
          <Section label="UPCOMING" evals={upcomingEvals} onDelete={deletePersonalEval} delay={0.3} />
        </div>

        {/* FAB */}
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsFormOpen(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-white text-black rounded-full flex items-center justify-center z-20"
        >
          <Plus size={32} strokeWidth={3} />
        </motion.button>

        {/* MODAL */}
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

function Section({ label, evals, onDelete, delay }: any) {
  if (evals.length === 0 && label === 'TODAY') return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay }} className="mb-8">
       <h2 className="text-xs font-bold text-neutral-600 tracking-widest mb-4 uppercase">{label}</h2>
       <p className="text-neutral-700 italic border-l-2 border-neutral-800 pl-4 py-2">No tasks. Stay focused.</p>
    </motion.div>
  );
  
  if (evals.length === 0) return null;

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="mb-8"
    >
      <h2 className="text-xs font-bold text-neutral-500 tracking-widest mb-4 uppercase flex items-center gap-2">
        {label}
        <div className="h-[1px] flex-1 bg-neutral-800"></div>
      </h2>
      
      <div className="space-y-3">
        {evals.map((e: EvalEvent) => (
          <div key={e.id} className="group relative bg-neutral-900 border border-neutral-800 hover:border-neutral-600 transition-colors p-5 rounded-lg">
            
            <div className="flex justify-between items-start mb-2">
              {/* TYPE BADGE (MONOCHROME) */}
              <span className="text-[10px] font-bold uppercase tracking-wider border border-neutral-700 px-2 py-1 rounded text-neutral-400">
                {e.type}
              </span>
              
              {/* TIME DISPLAY */}
              {e.time_range && (
                <div className="flex items-center gap-1.5 text-neutral-400">
                  <Clock size={12} />
                  <span className="text-xs font-medium tracking-wide">{e.time_range}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-xl font-bold text-white leading-tight">{e.title}</h3>
                {label === 'UPCOMING' && <p className="text-neutral-500 text-xs mt-1 font-medium">{format(parseISO(e.event_date), 'MMMM d')}</p>}
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
    </motion.section>
  );
}