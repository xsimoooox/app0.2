import React from 'react';
import {
  Clipboard,
  Keyboard,
  LogOut,
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
} from 'lucide-react';

function SideActionButton({
  label,
  onClick,
  active,
  activeTone = 'green',
  iconActive: IconActive,
  iconInactive: IconInactive,
  ariaLabel,
}) {
  const circleClass = (() => {
    if (!active) return 'bg-[#fee2e2] border-[#fecaca] text-[#ef4444]';
    if (activeTone === 'neutral') return 'bg-[#f5f5f5] border-[#e0e0e0] text-[#666666]';
    if (activeTone === 'hp') return 'bg-[#ecfdf5] border-[#bbf7d0] text-[#16a34a]';
    return 'bg-[#e8f5e9] border-[#c8e6c9] text-[#16a34a]';
  })();
  const labelClass = (() => {
    if (!active) return 'text-[#ef4444]';
    if (activeTone === 'neutral') return 'text-[#777777]';
    return 'text-[#16a34a]';
  })();

  const Icon = active ? IconActive : IconInactive;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel || label}
      className="flex flex-1 flex-col items-center gap-1 min-w-0 border-none bg-transparent cursor-pointer active:scale-95 transition-transform"
    >
      <span
        className={`w-11 h-11 rounded-full border flex items-center justify-center ${circleClass}`}
      >
        <Icon size={20} strokeWidth={2.25} />
      </span>
      <span className={`text-[9px] font-bold leading-none ${labelClass}`}>{label}</span>
    </button>
  );
}

function HpButton({ hpOn, onClick }) {
  return (
    <button
      type="button"
      id="btn-hp"
      onClick={onClick}
      aria-label="Haut-parleur"
      className="flex flex-1 flex-col items-center gap-1 min-w-0 border-none bg-transparent cursor-pointer active:scale-95 transition-transform"
    >
      <span
        className={`w-11 h-11 rounded-full border flex items-center justify-center ${
          hpOn
            ? 'bg-[#ecfdf5] border-[#bbf7d0] text-[#16a34a]'
            : 'bg-[#f5f5f5] border-[#e0e0e0] text-[#888888]'
        }`}
      >
        <Volume2 size={20} strokeWidth={2.25} />
      </span>
      <span
        className={`text-[9px] font-bold leading-none ${hpOn ? 'text-[#16a34a]' : 'text-[#888888]'}`}
      >
        HP
      </span>
    </button>
  );
}

/** Fin de session Rencontre — carré indigo, distinct du bouton d'appel rouge */
function EndRencontreButton({ onClick }) {
  return (
    <button
      type="button"
      id="btn-fin-rencontre"
      onClick={onClick}
      aria-label="Terminer la session"
      className="flex flex-1 flex-col items-center gap-1 min-w-0 border-none bg-transparent cursor-pointer active:scale-95 transition-transform"
    >
      <span className="w-11 h-11 rounded-[10px] border-2 border-[#6366f1] bg-[#f5f0ff] text-[#6366f1] flex items-center justify-center shadow-sm">
        <LogOut size={20} strokeWidth={2.25} />
      </span>
      <span className="text-[9px] font-bold text-[#6366f1] leading-none">Session</span>
    </button>
  );
}

function EndCallButton({ onClick, label = 'Terminer', size = 'md' }) {
  const dim = size === 'lg' ? 'w-[58px] h-[58px]' : 'w-[52px] h-[52px]';
  const iconSize = size === 'lg' ? 27 : 24;

  return (
    <button
      type="button"
      id="btn-terminer"
      onClick={onClick}
      aria-label={label}
      className="flex flex-col items-center gap-1 shrink-0 border-none bg-transparent cursor-pointer active:scale-95 transition-transform z-[2]"
    >
      <span
        className={`${dim} rounded-full bg-[#ef4444] text-white flex items-center justify-center shadow-[0_4px_14px_rgba(239,68,68,0.4)]`}
      >
        <PhoneOff size={iconSize} strokeWidth={2.5} />
      </span>
      <span className="text-[9px] font-bold text-[#ef4444] leading-none">{label}</span>
    </button>
  );
}

/** Barre d'actions Zone D — icônes Lucide, thème clair par défaut */
export default function ZoneDActionBar({
  variant = 'hearingCall',
  micOn = true,
  soundOn = true,
  hpOn = true,
  onMicro,
  onMute,
  onHp,
  onEnd,
  onCopy,
  onComposer,
  composerOpen = false,
  className = '',
  elevatedEnd = true,
}) {
  const barClass =
    'shrink-0 flex items-end justify-around px-3 pt-1 pb-2 bg-[#ffffff] border-t border-[#e5e5e5] select-none';

  if (variant === 'deafCall') {
    return (
      <div
        id="zone-d"
        className={`${barClass} h-[76px] items-center ${className}`}
      >
        <SideActionButton
          label={micOn ? 'Signer' : 'Attente'}
          onClick={onMicro}
          active={micOn}
          iconActive={Mic}
          iconInactive={MicOff}
          ariaLabel="Envoyer un signe LSF"
        />
        <SideActionButton
          label="Copier"
          onClick={onCopy}
          active
          activeTone="neutral"
          iconActive={Clipboard}
          iconInactive={Clipboard}
          ariaLabel="Copier le transcript"
        />
        <div className={elevatedEnd ? '-mt-4' : ''}>
          <EndCallButton onClick={onEnd} size="lg" />
        </div>
        <div className="flex-1" aria-hidden />
      </div>
    );
  }

  if (variant === 'hearingRencontre') {
    return (
      <div
        id="zone-d"
        className={`${barClass} h-[60px] items-center z-30 shadow-[0_-4px_14px_rgba(0,0,0,0.06)] ${className}`}
      >
        <SideActionButton
          label={micOn ? 'Parler' : 'Micro'}
          onClick={onMicro}
          active={micOn}
          iconActive={Mic}
          iconInactive={MicOff}
          ariaLabel={micOn ? 'Parler — micro actif' : 'Activer le micro pour parler'}
        />
        <SideActionButton
          label="Muet"
          onClick={onMute}
          active={soundOn}
          iconActive={Volume2}
          iconInactive={VolumeX}
          ariaLabel="Couper la lecture des signes des gants"
        />
        <SideActionButton
          label="Écrire"
          onClick={onComposer}
          active={composerOpen}
          activeTone="neutral"
          iconActive={Keyboard}
          iconInactive={Keyboard}
          ariaLabel="Saisir un message texte"
        />
        <EndRencontreButton onClick={onEnd} />
      </div>
    );
  }

  // hearingCall — 4 boutons
  return (
    <div id="zone-d" className={`${barClass} h-14 ${className}`}>
      <SideActionButton
        label="Micro"
        onClick={onMicro}
        active={micOn}
        iconActive={Mic}
        iconInactive={MicOff}
      />
      <SideActionButton
        label="Mute"
        onClick={onMute}
        active={soundOn}
        iconActive={Volume2}
        iconInactive={VolumeX}
        ariaLabel="Couper le son des signes"
      />
      <div className={elevatedEnd ? '-mt-5' : ''}>
        <EndCallButton onClick={onEnd} />
      </div>
      <HpButton hpOn={hpOn} onClick={onHp} />
    </div>
  );
}
