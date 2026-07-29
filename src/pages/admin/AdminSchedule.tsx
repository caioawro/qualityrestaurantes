import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, AlertTriangle, Clock, Calendar, CheckSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Schedule, Employee } from '../../lib/types';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Segunda-feira', short: 'Seg' },
  { id: 2, name: 'Terça-feira', short: 'Ter' },
  { id: 3, name: 'Quarta-feira', short: 'Qua' },
  { id: 4, name: 'Quinta-feira', short: 'Qui' },
  { id: 5, name: 'Sexta-feira', short: 'Sex' },
  { id: 6, name: 'Sábado', short: 'Sáb' },
  { id: 0, name: 'Domingo', short: 'Dom' },
];

export function AdminSchedule() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState<number>(new Date().getDay()); // Defaults to today

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Schedule | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [schedRes, empRes] = await Promise.all([
      supabase.from('schedules').select('*').order('start_time'),
      supabase.from('employees').select('*').eq('active', true).order('name')
    ]);
    if (schedRes.data) setSchedules(schedRes.data);
    if (empRes.data) setEmployees(empRes.data);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await supabase.from('schedules').delete().eq('id', confirmDelete.id);
    setConfirmDelete(null);
    fetchData();
  };

  const daySchedules = schedules.filter(s => s.days_of_week.includes(activeDay)).sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cronograma Semanal</h1>
          <p className="text-sm text-gray-500">Organize as rotinas e produções da cozinha</p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nova Rotina
        </button>
      </div>

      {/* Days Tabs */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex overflow-x-auto hide-scrollbar gap-2">
        {DAYS_OF_WEEK.map(day => (
          <button
            key={day.id}
            onClick={() => setActiveDay(day.id)}
            className={`flex-1 min-w-[80px] py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeDay === day.id 
                ? 'bg-primary-600 text-white shadow-md' 
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className="hidden sm:inline">{day.name}</span>
            <span className="sm:hidden">{day.short}</span>
          </button>
        ))}
      </div>

      {/* Schedules List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-500" />
          <h2 className="font-bold text-gray-900">Rotinas de {DAYS_OF_WEEK.find(d => d.id === activeDay)?.name}</h2>
          <span className="ml-auto bg-gray-200 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-full">
            {daySchedules.length}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">Carregando...</div>
        ) : daySchedules.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Nenhuma rotina cadastrada para este dia.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {daySchedules.map(sched => (
              <div key={sched.id} className="p-4 sm:p-5 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-16 h-16 rounded-xl bg-primary-50 flex flex-col items-center justify-center border border-primary-100 flex-shrink-0">
                    <span className="text-sm font-bold text-primary-700">{sched.start_time.slice(0,5)}</span>
                    <span className="text-[10px] text-primary-500 font-medium">até</span>
                    <span className="text-xs font-bold text-primary-600">{sched.end_time.slice(0,5)}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{sched.task_name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                      Responsável: <span className="font-medium text-gray-700">{sched.responsible}</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 self-end sm:self-auto mt-3 sm:mt-0">
                  <button type="button" onClick={() => setEditing(sched)} className="btn-secondary px-3 py-1.5 text-sm">
                    <Edit className="w-4 h-4" /> Editar
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(sched)} className="bg-error-50 text-error-600 hover:bg-error-100 px-3 py-1.5 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {(creating || editing) && (
        <ScheduleModal
          schedule={editing}
          employees={employees}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={fetchData}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div 
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-5 animate-fade-in" 
          onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null); }}
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-error-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-error-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Excluir rotina?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">Esta ação não pode ser desfeita.</p>
            
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancelar</button>
              <button type="button" onClick={handleDelete} className="flex-1 bg-error-600 text-white font-semibold rounded-xl px-6 py-3 hover:bg-error-700 active:scale-95 transition-all">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleModal({ schedule, employees, onClose, onSaved }: {
  schedule: Schedule | null; employees: Employee[]; onClose: () => void; onSaved: () => void;
}) {
  const [taskName, setTaskName] = useState(schedule?.task_name || '');
  const [startTime, setStartTime] = useState(schedule?.start_time.slice(0,5) || '08:00');
  const [endTime, setEndTime] = useState(schedule?.end_time.slice(0,5) || '09:00');
  const [responsible, setResponsible] = useState(schedule?.responsible || '');
  const [days, setDays] = useState<number[]>(schedule?.days_of_week || [1,2,3,4,5,6]); // default Mon-Sat
  const [active, setActive] = useState(schedule?.active ?? true);
  const [saving, setSaving] = useState(false);

  const toggleDay = (id: number) => {
    setDays(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!taskName.trim() || !responsible || days.length === 0) return;
    setSaving(true);
    
    const payload = {
      task_name: taskName.trim(),
      start_time: startTime,
      end_time: endTime,
      responsible: responsible.trim(),
      days_of_week: days,
      active,
    };

    if (schedule) {
      await supabase.from('schedules').update(payload).eq('id', schedule.id);
    } else {
      await supabase.from('schedules').insert(payload);
    }
    
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center px-5 animate-fade-in" 
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">{schedule ? 'Editar Rotina' : 'Nova Rotina'}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <label className="label-field">O que fazer? (Tarefa) *</label>
            <input className="input-field" value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="Ex: Preparar mise en place" autoFocus />
          </div>
          
          <div>
            <label className="label-field">Responsável *</label>
            <div className="flex gap-2">
              <select className="input-field" value={responsible} onChange={(e) => setResponsible(e.target.value)}>
                <option value="">Selecione...</option>
                {employees.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
                <option value="Todos">Todos</option>
                <option value="Equipe da Manhã">Equipe da Manhã</option>
                <option value="Equipe da Noite">Equipe da Noite</option>
                <option value="__other">Outro / Escrever livremente...</option>
              </select>
            </div>
            {responsible === '__other' && (
              <input className="input-field mt-2" placeholder="Digite o responsável" onChange={(e) => setResponsible(e.target.value)} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Horário Inicial *</label>
              <div className="relative">
                <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="time" className="input-field pl-9" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label-field">Horário Final *</label>
              <div className="relative">
                <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="time" className="input-field pl-9" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <label className="label-field mb-2 block">Dias da Semana *</label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    days.includes(day.id)
                      ? 'bg-primary-50 border-primary-200 text-primary-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {day.short}
                </button>
              ))}
            </div>
            {days.length === 0 && <p className="text-xs text-error-500 mt-1">Selecione ao menos um dia.</p>}
          </div>

        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button type="button" onClick={handleSave} disabled={saving || !taskName.trim() || !responsible || days.length === 0} className="btn-primary flex-1">{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
}
