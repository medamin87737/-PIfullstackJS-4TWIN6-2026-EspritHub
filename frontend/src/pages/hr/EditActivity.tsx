import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import type { RequiredSkill } from '../../types';
import { useToast } from '../../../hooks/use-toast';

type SkillOption = { intitule: string; type?: string };

export default function EditActivity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { users, departments, updateActivity, fetchWithAuth } = useData();
  const { toast } = useToast();
  const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

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
  const [allSkills, setAllSkills] = useState<SkillOption[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDetails, setNewSkillDetails] = useState('');
  const [newSkillType, setNewSkillType] = useState<'knowledge' | 'know_how' | 'soft_skills'>('knowledge');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!id) return;

    fetchWithAuth(`${API_BASE_URL}/activities/${id}`)
      .then((res) => {
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
        toast({ title: 'Erreur', description: 'Erreur lors du chargement de l’activité', variant: 'destructive' });
      });
  }, [API_BASE_URL, fetchWithAuth, id, toast]);

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

  const loadAllSkills = async () => {
    setSkillsLoading(true);
    try {
      const [resCompetences, resQuestions] = await Promise.all([
        fetchWithAuth(`${API_BASE_URL}/users/competences/all`),
        fetchWithAuth(`${API_BASE_URL}/users/question-competences/all`),
      ]);
      if (!resCompetences.ok || !resQuestions.ok) {
        throw new Error('Chargement des compétences impossible');
      }
      const payloadCompetences = await resCompetences.json();
      const payloadQuestions = await resQuestions.json();
      const rowsCompetences = Array.isArray(payloadCompetences?.data) ? payloadCompetences.data : (Array.isArray(payloadCompetences) ? payloadCompetences : []);
      const rowsQuestions = Array.isArray(payloadQuestions?.data) ? payloadQuestions.data : (Array.isArray(payloadQuestions) ? payloadQuestions : []);

      const merged = [
        ...rowsCompetences.map((r: any) => ({ intitule: String(r?.intitule ?? r?.name ?? '').trim(), type: r?.type ? String(r.type) : undefined })),
        ...rowsQuestions.map((r: any) => ({ intitule: String(r?.intitule ?? '').trim(), type: r?.type ? String(r.type) : undefined })),
      ].filter((s) => s.intitule.length > 0);
      const unique = Array.from(new Map(merged.map((s) => [s.intitule.toLowerCase(), s])).values()).sort((a, b) => a.intitule.localeCompare(b.intitule));
      setAllSkills(unique);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message ?? 'Chargement des compétences impossible', variant: 'destructive' });
    } finally {
      setSkillsLoading(false);
    }
  };

  const createSkillInDb = async () => {
    const name = newSkillName.trim();
    if (!name) {
      toast({ title: 'Nom requis', description: 'Saisissez le nom de la compétence.', variant: 'destructive' });
      return;
    }
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/users/question-competences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intitule: name,
          details: newSkillDetails.trim(),
          status: 'active',
          type: newSkillType,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Création de compétence impossible');
      }
      setNewSkillName('');
      setNewSkillDetails('');
      await loadAllSkills();
      toast({ title: 'Compétence créée', description: `${name} ajoutée à la base.`, variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message ?? 'Création de compétence impossible', variant: 'destructive' });
    }
  };

  useEffect(() => {
    void loadAllSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSkills = useMemo(
    () => allSkills.filter((s) => s.intitule.toLowerCase().includes(skillSearch.trim().toLowerCase())),
    [allSkills, skillSearch],
  );

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

      const response = await fetchWithAuth(`${API_BASE_URL}/activities/${id}`, {
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

      toast({ title: 'Succès', description: 'Activité mise à jour avec succès.', variant: 'success' });
      navigate('/hr/activities');
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erreur', description: err.message ?? 'Mise à jour impossible', variant: 'destructive' });
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
          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
            <input
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              placeholder="Rechercher une compétence existante"
              className="h-10 rounded-lg border px-3"
            />
            <button type="button" onClick={() => void loadAllSkills()} className="rounded-lg border px-3 py-2 text-sm">
              {skillsLoading ? 'Chargement...' : 'Actualiser liste'}
            </button>
          </div>
          <div className="mb-4 rounded-lg border bg-background p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Ajouter une compétence manquante à la base</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_170px_170px]">
              <input
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="Nom compétence"
                className="h-10 rounded-lg border px-3"
              />
              <input
                value={newSkillDetails}
                onChange={(e) => setNewSkillDetails(e.target.value)}
                placeholder="Détails (optionnel)"
                className="h-10 rounded-lg border px-3"
              />
              <select
                value={newSkillType}
                onChange={(e) => setNewSkillType((e.target.value as 'knowledge' | 'know_how' | 'soft_skills') ?? 'knowledge')}
                className="h-10 rounded-lg border px-3"
              >
                <option value="knowledge">knowledge</option>
                <option value="know_how">know_how</option>
                <option value="soft_skills">soft_skills</option>
              </select>
              <button
                type="button"
                onClick={() => void createSkillInDb()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white hover:opacity-90"
                title="Ajouter a la base"
                aria-label="Ajouter a la base"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {skills.map((skill, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3 rounded-lg border bg-background p-3">
                <div className="flex flex-1 min-w-[150px] flex-col gap-1">
                  <label>Compétence</label>
                  <select
                    value={skill.skill_name}
                    onChange={(e) => updateSkill(i, { skill_name: e.target.value })}
                    className="h-9 rounded-lg border px-3"
                  >
                    <option value="">-- Sélectionner une compétence --</option>
                    {filteredSkills.map((s, idx) => (
                      <option key={`${s.intitule}-${idx}`} value={s.intitule}>
                        {s.intitule}{s.type ? ` (${s.type})` : ''}
                      </option>
                    ))}
                  </select>
                  {errors[`skill_${i}`] && <span className="text-red-500 text-xs">{errors[`skill_${i}`]}</span>}
                </div>
                <div className="flex flex-col gap-1 min-w-[140px]">
                  <label>Niveau</label>
                  <select
                    value={skill.desired_level}
                    onChange={(e) => updateSkill(i, { desired_level: e.target.value as any })}
                    className="h-9 rounded-lg border px-3"
                  >
                    <option value="low">Bas</option>
                    <option value="medium">Moyen</option>
                    <option value="high">Élevé</option>
                    <option value="expert">Expert</option>
                  </select>
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


