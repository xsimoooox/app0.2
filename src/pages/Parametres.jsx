import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCallSystemContext } from '../context/CallSystemContext';
import { performLogout } from '../lib/logoutSession';
import {
  AlertTriangle,
  Bell,
  Calendar,
  Camera,
  Captions,
  Check,
  ChevronRight,
  ClipboardList,
  X,
  Contrast,
  Eye,
  FileText,
  Gauge,
  Globe2,
  KeyRound,
  Languages,
  Lock,
  ArrowLeft,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  MonitorSmartphone,
  Package,
  Palette,
  Phone,
  ShieldCheck,
  Star,
  Trash2,
  Type,
  User,
  Vibrate,
  Volume2,
} from 'lucide-react';

const initialProfile = {
  firstName: 'Jean',
  lastName: 'Dupont',
  birthDate: '12/05/1995',
  phone: '+33 6 XX XX XX XX',
  email: 'jean@mail.com',
  city: 'Paris',
  signLanguage: 'LSF',
};

const personalFields = [
  { key: 'firstName', label: 'Prénom', icon: User, type: 'text' },
  { key: 'lastName', label: 'Nom', icon: ShieldCheck, type: 'text' },
  { key: 'birthDate', label: 'Date de naissance', icon: Calendar, type: 'text' },
  { key: 'phone', label: 'Téléphone', icon: Phone, type: 'text' },
  { key: 'email', label: 'Email', icon: Mail, type: 'email' },
  { key: 'city', label: 'Ville', icon: MapPin, type: 'text' },
  { key: 'signLanguage', label: 'Langue des signes', icon: Languages, type: 'select', options: ['LSF', 'ASL', 'MSA'] },
];

function SectionTitle({ children, danger = false }) {
  return (
    <div className={`mx-4 mt-4 mb-2 text-[11px] font-bold uppercase ${danger ? 'text-[#EF4444]' : 'text-[#9CA3AF]'}`}>
      {children}
    </div>
  );
}

function SettingsCard({ children, danger = false, className = '' }) {
  return (
    <div
      className={`mx-4 overflow-hidden rounded-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] ${
        danger ? 'border border-[#FECACA] bg-[#FFF1F1]' : 'bg-white'
      } ${className}`}
    >
      {children}
    </div>
  );
}

function IconBubble({ icon: Icon, danger = false }) {
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-white text-[#EF4444]' : 'bg-[#F3F4F6] text-[#4F46E5]'}`}>
      <Icon size={18} strokeWidth={2.1} />
    </span>
  );
}

function Row({ icon, label, value, onClick, children, danger = false, bold = false }) {
  const Icon = icon;
  const interactive = Boolean(onClick);
  const Wrapper = interactive ? 'button' : 'div';

  return (
    <Wrapper
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      className={`flex min-h-[56px] w-full items-center gap-3 border-b border-[#F3F4F6] px-4 py-[14px] text-left last:border-b-0 ${
        interactive ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default'
      }`}
    >
      <IconBubble icon={Icon} danger={danger} />
      <span className={`min-w-0 flex-1 text-[14px] ${danger ? 'text-[#EF4444]' : 'text-[#1F2937]'} ${bold ? 'font-bold' : 'font-medium'}`}>
        {label}
      </span>
      {children || (
        <>
          {value && <span className="max-w-[150px] truncate text-right text-[13px] font-medium text-[#6B7280]">{value}</span>}
          {onClick && <ChevronRight size={18} className="shrink-0 text-[#D1D5DB]" />}
        </>
      )}
    </Wrapper>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onChange(!checked);
      }}
      className={`relative h-[30px] w-[52px] shrink-0 overflow-hidden rounded-full transition-colors ${checked ? 'bg-[#4F46E5]' : 'bg-[#D1D5DB]'}`}
    >
      <span
        className={`absolute left-[3px] top-[3px] h-6 w-6 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.15)] transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SliderControl({ value, min, max, step = 1, suffix = '', onChange }) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex w-[150px] shrink-0 items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-[6px] w-full appearance-none rounded-full [&::-webkit-slider-thumb]:h-[22px] [&::-webkit-slider-thumb]:w-[22px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.15)]"
        style={{
          background: `linear-gradient(to right, #4F46E5 ${percent}%, #E5E7EB ${percent}%)`,
        }}
      />
      <span className="w-8 text-right text-[12px] font-bold text-[#6B7280]">
        {value}{suffix}
      </span>
    </div>
  );
}

function AvatarChoiceCard({ active, name, description, tone, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex-1 rounded-[14px] border-2 p-2 text-left transition active:scale-[0.97] ${
        active ? 'border-[#4F46E5]' : 'border-[#E5E7EB]'
      }`}
    >
      {active && (
        <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-[#4F46E5] px-2 py-1 text-[10px] font-bold text-white">
          <Check size={11} strokeWidth={3} /> Actif
        </span>
      )}
      <div className={`mb-3 flex h-[140px] aspect-[9/16] w-full items-end justify-center overflow-hidden rounded-[12px] ${tone}`}>
        <div className="mb-3 flex h-[76px] w-[52px] flex-col items-center rounded-t-full bg-white/85 shadow-sm">
          <div className="mt-2 h-8 w-8 rounded-full bg-[#4F46E5]/20" />
          <div className="mt-2 h-7 w-10 rounded-t-[18px] bg-[#4F46E5]/30" />
        </div>
      </div>
      <div className="text-[14px] font-bold text-[#1F2937]">{name}</div>
      <div className="text-[11px] font-medium text-[#6B7280]">{description}</div>
    </button>
  );
}

export default function Parametres() {
  const navigate = useNavigate();
  const { disconnectSocket } = useCallSystemContext();
  const [dirty, setDirty] = useState(false);
  const [profile, setProfile] = useState(initialProfile);
  const [avatar, setAvatar] = useState(() => localStorage.getItem('avatarChoice') || 'alex');
  const [sheet, setSheet] = useState(null);
  const [accessibility, setAccessibility] = useState({
    textSize: 14,
    highContrast: false,
    avatarSpeed: 1,
    subtitles: true,
    vibration: true,
    colorBlind: 'Aucun',
  });
  const [notifications, setNotifications] = useState({
    enabled: true,
    sessionReminders: true,
    appUpdates: false,
    sounds: true,
    vibration: true,
  });
  const [security, setSecurity] = useState({
    biometric: true,
  });

  const profileComplete = useMemo(
    () => Object.values(profile).every(value => String(value).trim().length > 0),
    [profile]
  );

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();

  const markDirty = () => setDirty(true);

  const updateAvatar = (nextAvatar) => {
    setAvatar(nextAvatar);
    localStorage.setItem('avatarChoice', nextAvatar);
    markDirty();
  };

  const updateAccessibility = (key, value) => {
    setAccessibility(prev => ({ ...prev, [key]: value }));
    markDirty();
  };

  const updateNotifications = (key, value) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
    markDirty();
  };

  const updateSecurity = (key, value) => {
    setSecurity(prev => ({ ...prev, [key]: value }));
    markDirty();
  };

  const openFieldSheet = (field) => {
    setSheet({
      type: 'field',
      title: field.label,
      field,
      value: profile[field.key],
    });
  };

  const openSimpleSheet = (title, message, options = null) => {
    setSheet({ type: 'simple', title, message, options });
  };

  const confirmFieldSheet = () => {
    if (!sheet || sheet.type !== 'field') return;
    setProfile(prev => ({ ...prev, [sheet.field.key]: sheet.value }));
    setSheet(null);
    markDirty();
  };

  const saveSettings = () => {
    localStorage.setItem('wakwak_profile_data', JSON.stringify({ profile, accessibility, notifications, security }));
    localStorage.setItem('avatarChoice', avatar);
    setDirty(false);
    setSheet({ type: 'simple', title: 'Enregistré', message: 'Vos paramètres ont été sauvegardés.' });
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('wakwak_profile_data');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.profile) setProfile(data.profile);
        if (data.accessibility) setAccessibility(data.accessibility);
        if (data.notifications) setNotifications(data.notifications);
        if (data.security) setSecurity(data.security);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const confirmDelete = () => {
    localStorage.removeItem('wakwak_profile_data');
    localStorage.removeItem('wakwak_user');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('sessions');
    localStorage.removeItem('wakwak_contacts');
    localStorage.removeItem('avatarChoice');
    setSheet(null);
    setDirty(false);
    performLogout(navigate, disconnectSocket);
  };

  return (
    <>
    <div
      className="fixed left-0 right-0 top-0 mx-auto flex h-[calc(100vh-65px)] w-full max-w-md flex-col overflow-hidden bg-[#F0F2F5] font-sans text-[#1F2937] animate-fade-in"
    >
      <header className="grid h-[52px] shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-[#E5E7EB] bg-white px-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="justify-self-start flex items-center gap-1 text-[13px] font-bold text-[#4F46E5] active:scale-95"
        >
          <ArrowLeft size={16} strokeWidth={2.5} />
          Retour
        </button>
        <h1 className="text-[16px] font-bold text-[#1F2937]">Paramètres</h1>
        <div className="justify-self-end">
          {dirty && (
            <button
              type="button"
              onClick={saveSettings}
              className="flex items-center gap-1 text-[13px] font-bold text-[#4F46E5] active:scale-95"
            >
              <Check size={16} strokeWidth={2.5} />
              Sauvegarder
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto scroll-smooth pb-5">
        <section className="m-4 rounded-[20px] bg-white p-5 text-center shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <div className="relative mx-auto h-20 w-20">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#4F46E5] to-[#9333EA] text-[24px] font-extrabold text-white shadow-inner">
              {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
            </div>
            <button
              type="button"
              onClick={() => openSimpleSheet('Photo de profil', 'Choisissez une nouvelle photo depuis votre appareil.')}
              className="absolute bottom-0 right-0 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#4F46E5] text-white shadow-md active:scale-95"
            >
              <Camera size={16} />
            </button>
          </div>
          <div className="mt-3 text-[18px] font-bold text-[#1F2937]">{fullName}</div>
          <div className="mt-1 text-[13px] font-medium text-[#6B7280]">Utilisateur sourd</div>
          <div className={`mx-auto mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-bold ${
            profileComplete ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#FFFBEB] text-[#D97706]'
          }`}>
            {profileComplete ? <Check size={14} /> : <AlertTriangle size={14} />}
            {profileComplete ? 'Profil complet' : 'Profil incomplet'}
          </div>
        </section>

        <SectionTitle>Informations</SectionTitle>
        <SettingsCard>
          {personalFields.map(field => (
            <Row
              key={field.key}
              icon={field.icon}
              label={field.label}
              value={profile[field.key]}
              onClick={() => openFieldSheet(field)}
            />
          ))}
        </SettingsCard>

        <SectionTitle>Avatar</SectionTitle>
        <SettingsCard className="p-4">
          <div className="text-[14px] font-bold text-[#1F2937]">Votre interprète virtuel</div>
          <p className="mt-1 text-[12px] font-medium leading-relaxed text-[#6B7280]">
            Choisissez l'avatar qui vous accompagne pendant vos sessions
          </p>
          <div className="mt-4 flex gap-3">
            <AvatarChoiceCard
              active={avatar === 'alex'}
              name="Alex"
              description="Masculin · Professionnel"
              tone="bg-gradient-to-b from-[#E0E7FF] to-[#C7D2FE]"
              onClick={() => updateAvatar('alex')}
            />
            <AvatarChoiceCard
              active={avatar === 'frizitta'}
              name="Frizita"
              description="Féminin · Chaleureux"
              tone="bg-gradient-to-b from-[#FCE7F3] to-[#DDD6FE]"
              onClick={() => updateAvatar('frizitta')}
            />
          </div>
        </SettingsCard>

        <SectionTitle>Accessibilité</SectionTitle>
        <SettingsCard>
          <Row icon={Type} label="Taille du texte">
            <SliderControl value={accessibility.textSize} min={12} max={20} suffix="px" onChange={(value) => updateAccessibility('textSize', value)} />
          </Row>
          <Row icon={Contrast} label="Contraste élevé">
            <Toggle checked={accessibility.highContrast} onChange={(value) => updateAccessibility('highContrast', value)} />
          </Row>
          <Row icon={Gauge} label="Vitesse avatar">
            <SliderControl value={accessibility.avatarSpeed} min={0.5} max={2} step={0.5} suffix="x" onChange={(value) => updateAccessibility('avatarSpeed', value)} />
          </Row>
          <Row icon={Captions} label="Sous-titres toujours visibles">
            <Toggle checked={accessibility.subtitles} onChange={(value) => updateAccessibility('subtitles', value)} />
          </Row>
          <Row icon={Vibrate} label="Vibration retour gant">
            <Toggle checked={accessibility.vibration} onChange={(value) => updateAccessibility('vibration', value)} />
          </Row>
          <Row
            icon={Eye}
            label="Mode daltonien"
            value={accessibility.colorBlind}
            onClick={() => setSheet({ type: 'accessibility-select', title: 'Mode daltonien', value: accessibility.colorBlind })}
          />
        </SettingsCard>

        <SectionTitle>Notifications</SectionTitle>
        <SettingsCard>
          <Row icon={Bell} label="Notifications activées">
            <Toggle checked={notifications.enabled} onChange={(value) => updateNotifications('enabled', value)} />
          </Row>
          <Row icon={Calendar} label="Rappels de session">
            <Toggle checked={notifications.sessionReminders} onChange={(value) => updateNotifications('sessionReminders', value)} />
          </Row>
          <Row icon={Package} label="Mises à jour de l'app">
            <Toggle checked={notifications.appUpdates} onChange={(value) => updateNotifications('appUpdates', value)} />
          </Row>
          <Row icon={Volume2} label="Sons de notification">
            <Toggle checked={notifications.sounds} onChange={(value) => updateNotifications('sounds', value)} />
          </Row>
          <Row icon={Vibrate} label="Vibration">
            <Toggle checked={notifications.vibration} onChange={(value) => updateNotifications('vibration', value)} />
          </Row>
        </SettingsCard>

        <SectionTitle>Sécurité</SectionTitle>
        <SettingsCard>
          <Row icon={KeyRound} label="Changer le mot de passe" onClick={() => openSimpleSheet('Changer le mot de passe', 'Un lien sécurisé sera envoyé à votre email.')} />
          <Row icon={Eye} label="Authentification biométrique">
            <Toggle checked={security.biometric} onChange={(value) => updateSecurity('biometric', value)} />
          </Row>
          <Row icon={MonitorSmartphone} label="Appareils connectés" onClick={() => openSimpleSheet('Appareils connectés', 'Téléphone principal · Navigateur web · Tablette familiale')} />
          <Row icon={Lock} label="Verrouillage automatique" value="5 min" onClick={() => openSimpleSheet('Verrouillage automatique', 'Choisissez un délai de verrouillage.', ['1 min', '5 min', '15 min', 'Jamais'])} />
          <Row icon={ClipboardList} label="Historique des sessions" onClick={() => navigate('/historique')} />
        </SettingsCard>

        <SectionTitle>Application</SectionTitle>
        <SettingsCard>
          <Row icon={Globe2} label="Langue de l'interface" value="Français" onClick={() => openSimpleSheet("Langue de l'interface", 'Français est actuellement sélectionné.', ['Français', 'English', 'العربية'])} />
          <Row icon={Palette} label="Thème" value="Clair" onClick={() => openSimpleSheet('Thème', 'Choisissez un thème pour l’application.', ['Clair', 'Sombre', 'Auto'])} />
          <Row icon={Package} label="Version" value="1.0.0" onClick={() => openSimpleSheet('Version', "L'application est à jour.")} />
          <Row icon={FileText} label="Conditions d'utilisation" onClick={() => openSimpleSheet("Conditions d'utilisation", 'Les conditions seront affichées ici.')} />
          <Row icon={ShieldCheck} label="Politique de confidentialité" onClick={() => openSimpleSheet('Politique de confidentialité', 'Votre confidentialité reste protégée.')} />
          <Row icon={MessageCircle} label="Contacter le support" onClick={() => openSimpleSheet('Support', 'support@wakwak.app')} />
          <Row icon={Star} label="Noter l'application" onClick={() => openSimpleSheet("Noter l'application", 'Merci pour votre retour.')} />
        </SettingsCard>

        <SectionTitle danger>Zone danger</SectionTitle>
        <SettingsCard danger>
          <Row icon={LogOut} label="Se déconnecter" danger onClick={() => setSheet({ type: 'logout' })} />
          <Row icon={Trash2} label="Supprimer mon compte" danger bold onClick={() => setSheet({ type: 'delete' })} />
        </SettingsCard>
      </main>

    </div>

      {sheet && (
        <div className="fixed inset-x-0 top-0 bottom-[65px] z-[10000] flex items-end justify-center bg-black/35">
          <div className="max-h-[calc(100vh-89px)] w-full max-w-md overflow-y-auto rounded-t-[24px] bg-white p-5 shadow-2xl animate-fade-in">
            {sheet.type === 'field' && (
              <>
                <h2 className="text-[16px] font-bold text-[#1F2937]">{sheet.title}</h2>
                {sheet.field.type === 'select' ? (
                  <select
                    value={sheet.value}
                    onChange={(event) => setSheet(prev => ({ ...prev, value: event.target.value }))}
                    className="mt-4 h-12 w-full rounded-[12px] border border-[#E5E7EB] bg-white px-3 text-[14px] font-semibold text-[#1F2937] outline-none focus:border-[#4F46E5]"
                  >
                    {sheet.field.options.map(option => <option key={option}>{option}</option>)}
                  </select>
                ) : (
                  <input
                    type={sheet.field.type}
                    value={sheet.value}
                    onChange={(event) => setSheet(prev => ({ ...prev, value: event.target.value }))}
                    className="mt-4 h-12 w-full rounded-[12px] border border-[#E5E7EB] px-3 text-[14px] font-semibold text-[#1F2937] outline-none focus:border-[#4F46E5]"
                  />
                )}
                <button
                  type="button"
                  onClick={confirmFieldSheet}
                  className="mt-5 h-12 w-full rounded-[12px] bg-[#4F46E5] text-[14px] font-bold text-white active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Check size={18} strokeWidth={2.5} />
                  Confirmer
                </button>
              </>
            )}

            {sheet.type === 'accessibility-select' && (
              <>
                <h2 className="text-[16px] font-bold text-[#1F2937]">{sheet.title}</h2>
                <div className="mt-4 grid gap-2">
                  {['Aucun', 'Deutéranopie', 'Protanopie'].map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        updateAccessibility('colorBlind', option);
                        setSheet(null);
                      }}
                      className={`h-11 rounded-[12px] text-[14px] font-bold ${accessibility.colorBlind === option ? 'bg-[#4F46E5] text-white' : 'bg-[#F3F4F6] text-[#1F2937]'}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            )}

            {sheet.type === 'simple' && (
              <>
                <h2 className="text-[16px] font-bold text-[#1F2937]">{sheet.title}</h2>
                <p className="mt-2 text-[12px] font-medium leading-relaxed text-[#6B7280]">{sheet.message}</p>
                {sheet.options && (
                  <div className="mt-4 grid gap-2">
                    {sheet.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          if (sheet.title.includes('Langue')) {
                            localStorage.setItem('wakwak_ui_lang', option);
                          }
                          if (sheet.title.includes('Thème')) {
                            localStorage.setItem('wakwak_ui_theme', option);
                          }
                          if (sheet.title.includes('Verrouillage')) {
                            localStorage.setItem('wakwak_auto_lock', option);
                          }
                          markDirty();
                          setSheet(null);
                        }}
                        className="h-11 rounded-[12px] bg-[#F3F4F6] text-[14px] font-bold text-[#1F2937]"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => setSheet(null)} className="mt-5 h-12 w-full rounded-[12px] bg-[#4F46E5] text-[14px] font-bold text-white active:scale-[0.98] flex items-center justify-center gap-2">
                  <X size={18} strokeWidth={2.5} />
                  Fermer
                </button>
              </>
            )}

            {sheet.type === 'logout' && (
              <>
                <h2 className="text-[16px] font-bold text-[#1F2937]">Se déconnecter</h2>
                <p className="mt-2 text-[12px] font-medium leading-relaxed text-[#6B7280]">
                  Votre session locale sera fermée. Vous devrez recréer ou reconnecter votre profil.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSheet(null);
                    performLogout(navigate, disconnectSocket);
                  }}
                  className="mt-5 h-12 w-full rounded-[12px] bg-[#EF4444] text-[14px] font-bold text-white active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <LogOut size={18} strokeWidth={2.25} />
                  Confirmer
                </button>
                <button
                  type="button"
                  onClick={() => setSheet(null)}
                  className="mt-3 h-12 w-full rounded-[12px] bg-[#F3F4F6] text-[14px] font-bold text-[#1F2937] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <X size={18} strokeWidth={2.5} />
                  Annuler
                </button>
              </>
            )}

            {sheet.type === 'delete' && (
              <>
                <h2 className="text-[16px] font-bold text-[#EF4444]">Supprimer mon compte</h2>
                <p className="mt-2 text-[12px] font-medium leading-relaxed text-[#6B7280]">
                  Cette action supprimera définitivement votre profil, vos réglages et vos historiques synchronisés. Elle ne peut pas être annulée.
                </p>
                <button type="button" onClick={confirmDelete} className="mt-5 h-12 w-full rounded-[12px] bg-[#EF4444] text-[14px] font-bold text-white active:scale-[0.98] flex items-center justify-center gap-2">
                  <Trash2 size={18} strokeWidth={2.25} />
                  Confirmer la suppression
                </button>
                <button type="button" onClick={() => setSheet(null)} className="mt-3 h-12 w-full rounded-[12px] bg-[#F3F4F6] text-[14px] font-bold text-[#1F2937] active:scale-[0.98] flex items-center justify-center gap-2">
                  <X size={18} strokeWidth={2.5} />
                  Annuler
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
