import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import type { RequiredSkill } from '../../types';

export default function EditActivity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { users, updateActivity } = useData();

  const managers = users.filter(u => u.role === 'MANAGER');

  // État du formulaire avec les mêmes noms de champs que CreateActivity
  const [form, setForm] = useState({
    title: '',
    description: '',
    maxParticipants: 5,
    departmentId: '',
    startDate: '',
    endDate: '',
  });

  const [skills, setSkills] = useState<RequiredSkill[]>([
    { skill_name: '', desired_level: 'medium' }
  ]);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Départements statiques
  const departments = [
    { id: '1', name: 'Ressources Humaines' },
    { id: '2', name: 'Informatique' },
    { id: '3', name: 'Marketing' },
    { id: '4', name: 'Finance' }
  ];

  useEffect(() => {
    if (!id) return;

    fetch(`http://localhost:3000/activities/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Erreur lors de la récupération de l’activité');
        return res.json();
      })
      .then(data => {
        setForm({
          title: data.title || '',
          description: data.description || '',
          maxParticipants: data.maxParticipants || 5,
          departmentId: data.departmentId || '',
          startDate: data.startDate ? new Date(data.startDate).toISOString().slice(0,16) : '',
          endDate: data.endDate ? new Date(data.endDate).toISOString().slice(0,16) : '',
        });

        setSkills(
          data.requiredSkills?.map((s: any) => ({
            skill_name: s.skill_name,
            desired_level: s.desired_level ?? 'medium',
          })) || [{ skill_name: '', desired_level: 'medium' }]
        );
      })
      .catch(err => {
        console.error(err);
        alert('Erreur lors du chargement de l’activité');
      });
  }, [id]);

  const addSkill = () => setSkills([...skills, { skill_name: '', desired_level: 'medium' }]);
  const removeSkill = (i: number) => setSkills(skills.filter((_, idx) => idx !== i));
  const updateSkill = (i: number, updates: Partial<RequiredSkill>) =>
    setSkills(skills.map((s, idx) => idx === i ? { ...s, ...updates } : s));

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!form.title.trim()) newErrors.title = 'Le titre est requis';
    if (!form.description.trim()) newErrors.description = 'La description est requise';
    if (!form.departmentId) newErrors.departmentId = 'Le département doit être sélectionné';
    if (!form.startDate) newErrors.startDate = 'La date de début est requise';
    if (!form.endDate) newErrors.endDate = 'La date de fin est requise';
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate))
      newErrors.endDate = 'La date de fin doit être après la date de début';
    if (form.maxParticipants < 1) newErrors.maxParticipants = 'Le nombre de participants doit être au moins 1';

    skills.forEach((s, i) => {
      if (!s.skill_name.trim()) newErrors[`skill_${i}`] = 'Le nom de la compétence est requis';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !id) return;

    try {
      const payload = {
        title: form.title,
        description: form.description,
        maxParticipants: form.maxParticipants,
        departmentId: form.departmentId,
        startDate: new Date(form.startDate),
        endDate: new Date(form.endDate),
        requiredSkills: skills
          .filter(s => s.skill_name)
          .map(s => ({
            skill_name: s.skill_name,
            desired_level: s.desired_level,
          })),
      };

      const response = await fetch(`http://localhost:3000/activities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors de la mise à jour de l’activité');
      }

      const updated = await response.json();
      updateActivity({
        id: updated?._id ?? updated?.id ?? id,
        title: updated?.title ?? payload.title,
        description: updated?.description ?? payload.description,
        type: updated?.type ?? 'training',
        required_skills: (updated?.requiredSkills ?? payload.requiredSkills ?? []).map((s: any) => ({
          skill_name: s.skill_name,
          desired_level: s.desired_level ?? 'medium',
        })),
        seats: updated?.maxParticipants ?? payload.maxParticipants,
        date: updated?.startDate ? new Date(updated.startDate).toISOString() : new Date(payload.startDate).toISOString(),
        duration: 'N/A',
        location: 'N/A',
        priority: 'consolidate_medium',
        status: 'open',
        created_by: user?.name ?? 'HR',
        assigned_manager: undefined,
        created_at: updated?.createdAt ?? new Date().toISOString(),
        updated_at: updated?.updatedAt ?? new Date().toISOString(),
      });

      alert('Activité mise à jour avec succès !');
      navigate('/hr/activities');
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Modifier l'activité</h1>
          <p className="text-sm text-muted-foreground">Mettre à jour les informations et compétences de l’activité</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Infos générales */}
        <div className="rounded-xl border p-6 bg-card">
          <h3 className="mb-4 text-sm font-semibold">Informations générales</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label>Titre</label>
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="h-10 rounded-lg border px-3"
              />
              {errors.title && <span className="text-red-500 text-xs">{errors.title}</span>}
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label>Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="rounded-lg border px-3 py-2"
              />
              {errors.description && <span className="text-red-500 text-xs">{errors.description}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label>Nombre max de participants</label>
              <input
                type="number"
                min={1}
                value={form.maxParticipants}
                onChange={e => setForm({ ...form, maxParticipants: +e.target.value })}
                className="h-10 rounded-lg border px-3"
              />
              {errors.maxParticipants && <span className="text-red-500 text-xs">{errors.maxParticipants}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label>Département</label>
              <select
                value={form.departmentId}
                onChange={e => setForm({ ...form, departmentId: e.target.value })}
                className="h-10 rounded-lg border px-3"
              >
                <option value="">-- Sélectionner --</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {errors.departmentId && <span className="text-red-500 text-xs">{errors.departmentId}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label>Date de début</label>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
                className="h-10 rounded-lg border px-3"
              />
              {errors.startDate && <span className="text-red-500 text-xs">{errors.startDate}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label>Date de fin</label>
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
                className="h-10 rounded-lg border px-3"
              />
              {errors.endDate && <span className="text-red-500 text-xs">{errors.endDate}</span>}
            </div>
          </div>
        </div>

        {/* Compétences requises */}
        <div className="rounded-xl border p-6 bg-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Compétences requises</h3>
            <button type="button" onClick={addSkill} className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {skills.map((skill, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3 rounded-lg border bg-background p-3">
                <div className="flex flex-1 min-w-[150px] flex-col gap-1">
                  <label>Compétence</label>
                  <input
                    value={skill.skill_name}
                    onChange={e => updateSkill(i, { skill_name: e.target.value })}
                    placeholder="Nom de la compétence"
                    className="h-9 rounded-lg border px-3"
                  />
                  {errors[`skill_${i}`] && <span className="text-red-500 text-xs">{errors[`skill_${i}`]}</span>}
                </div>
                {skills.length > 1 && (
                  <button type="button" onClick={() => removeSkill(i)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="rounded-lg border px-6 py-2.5 text-sm">Annuler</button>
          <button type="submit" className="rounded-lg bg-primary px-6 py-2.5 text-sm text-white">Mettre à jour</button>
        </div>
      </form>
    </div>
  );
}
