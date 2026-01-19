'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { format, isSameDay, addDays, parseISO, isAfter } from 'date-fns';
import { Plus, Trash2, Calendar, BookOpen, FlaskConical, AlertCircle } from 'lucide-react';

// --- CONFIGURATION ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type EvalEvent = {
  id: string | number;
  title: string;
  event_date: string; // YYYY-MM-DD
  type: 'Quiz' | 'Midsem' | 'Lab' | 'Deadline' | 'Compre' | 'Personal';
  isPersonal?: boolean;
};

export default function Home() {
  const [masterEvals, setMasterEvals] = useState<EvalEvent[]>([]);
  const [personalEvals, setPersonalEvals] = useState<EvalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [newEventTitle, setNewEventTitle] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // --- DATA FETCHING ---
  useEffect(() => {
    async function fetchData() {
      // 1. Fetch Official Data (Only today & future)
      const { data, error } = await supabase
        .from('evals')
        .select('*')
        .gte('event_date', format(new Date(), 'yyyy-MM-dd'))
        .order('event_date', { ascending: true });

      if (data) setMasterEvals(data as any);
      if (error) console.error('Supabase Error:', error);

      // 2. Fetch Personal Data (LocalStorage)
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
      event_date: format(new Date(), 'yyyy-MM-dd'), // Defaults to today for MVP
      type: 'Personal',
      isPersonal: true,
    };

    const updated = [...personalEvals, newEval];
    setPersonalEvals(updated);
    localStorage.setItem('personalEvals', JSON.stringify(updated));
    setNewEventTitle('');
    setIsFormOpen(false);
  };

  const deletePersonalEval = (id: string | number) => {
    const updated = personalEvals.filter((e) => e.id !== id);
    setPersonalEvals(updated);
    localStorage.setItem('personalEvals', JSON.stringify(updated));
  };

  // --- FILTERING LOGIC ---
  const today = new Date();
  const tomorrow = addDays(today, 1);

  // Merge official and personal
  const allEvals = [...masterEvals, ...personalEvals];
  
  // Buckets
  const todayEvals = allEvals.filter((e) => isSameDay(parseISO(e.event_date), today));
  const tomorrowEvals = allEvals.filter((e) => isSameDay(parseISO(e.event_date), tomorrow));
  
  // "Upcoming" (Next 7 days excluding today/tomorrow)
  const upcomingEvals = allEvals.filter((e) => {
    const date = parseISO(e.event_date);
    return isAfter(date, tomorrow) && isAfter(addDays(today, 14), date);
  });

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-neutral-500 animate-pulse">Syncing...</div>;

  return (
    <main className="min-h-screen bg-black text-neutral-100 font-sans selection:bg-neutral-800">
      <div className="max-w-md mx-auto min-h-screen p-6 relative flex flex-col">
        
        {/* HEADER */}
        <header className="mt-8 mb-10">
          <h1 className="text-4xl font-bold tracking-tighter text-white">Focus.</h1>
          <p className="text-neutral-500 mt-2 text-sm font-medium uppercase tracking-widest">BITS Pilani • Goa Campus</p>
        </header>

        {/* TODAY */}
        <Section title="Today" evals={todayEvals} onDelete={deletePersonalEval} active />

        {/* TOMORROW */}
        <Section title="Tomorrow" evals={tomorrowEvals} onDelete={deletePersonalEval} />

        {/* UPCOMING LOOKAHEAD */}
        <Section title="Coming Up" evals={upcomingEvals} onDelete={deletePersonalEval} compact />

        {/* FLOATING ACTION BUTTON */}
        <button 
          onClick={() => setIsFormOpen(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-white text-black rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>

        {/* MODAL */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-2xl">
              <h3 className="text-lg font-semibold mb-4 text-white">Add Personal Task</h3>
              <input 
                autoFocus
                type="text" 
                placeholder="e.g. Finish Lab Record"
                className="w-full bg-black border border-neutral-700 p-4 rounded-xl mb-4 text-white focus:outline-none focus:border-neutral-500 placeholder:text-neutral-600"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={() => setIsFormOpen(false)} className="flex-1 py-3 rounded-xl text-neutral-400 hover:bg-neutral-800 transition-colors">Cancel</button>
                <button onClick={addPersonalEval} className="flex-1 py-3 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition-colors">Add Task</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// --- SUB-COMPONENTS ---

function Section({ title, evals, onDelete, active = false, compact = false }: any) {
  if (evals.length === 0) return null;

  return (
    <section className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-3 mb-4">
        {active && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"></div>}
        <h2 className={`font-semibold ${active ? 'text-white text-xl' : 'text-neutral-500 text-lg'}`}>{title}</h2>
      </div>
      
      <div className="space-y-3">
        {evals.map((e: EvalEvent) => (
          <div key={e.id} className="group relative bg-neutral-900/50 border border-neutral-800/60 p-4 rounded-2xl flex items-start gap-4 hover:bg-neutral-900 transition-colors">
            
            {/* ICON BASED ON TYPE */}
            <div className={`mt-1 p-2 rounded-lg ${
              e.type === 'Quiz' ? 'bg-orange-500/10 text-orange-500' :
              e.type === 'Midsem' || e.type === 'Compre' ? 'bg-red-500/10 text-red-500' :
              e.type === 'Lab' ? 'bg-blue-500/10 text-blue-500' :
              'bg-neutral-700/30 text-neutral-400'
            }`}>
              {e.type === 'Lab' ? <FlaskConical size={18} /> : 
               e.type === 'Midsem' || e.type === 'Compre' ? <AlertCircle size={18} /> :
               e.type === 'Quiz' ? <BookOpen size={18} /> :
               <Calendar size={18} />}
            </div>

            <div className="flex-1">
              <h3 className="text-neutral-200 font-medium leading-tight">{e.title}</h3>
              {!compact && <p className="text-neutral-500 text-xs mt-1.5 font-medium tracking-wide uppercase">{e.type} • {format(parseISO(e.event_date), 'MMM d')}</p>}
              {compact && <p className="text-neutral-500 text-xs mt-1">{format(parseISO(e.event_date), 'EEE, MMM d')}</p>}
            </div>

            {e.isPersonal && (
              <button onClick={() => onDelete(e.id)} className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-500 transition-all p-2">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}