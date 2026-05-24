/** Classes du bouton d'appel sur les cards — logique uniquement, design existant préservé */
export function getContactCallState(realtimeStatus) {
  if (realtimeStatus === 'online') {
    return {
      disabled: false,
      buttonClass:
        'w-7 h-7 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform cursor-pointer bg-[#16a34a] hover:bg-emerald-600',
      useLucidePhone: true,
    };
  }
  if (realtimeStatus === 'busy') {
    return {
      disabled: true,
      buttonClass:
        'w-7 h-7 rounded-full flex items-center justify-center text-white opacity-80 cursor-not-allowed bg-[#f97316]',
      useLucidePhone: false,
      themifyIcon: 'ti-control-pause',
    };
  }
  return {
    disabled: true,
    buttonClass:
      'w-7 h-7 rounded-full flex items-center justify-center cursor-not-allowed bg-[#2a2a2a]',
    useLucidePhone: false,
    themifyIcon: 'ti-phone-off',
    themifyColor: '#666',
  };
}

export function getEntendantCallState(realtimeStatus) {
  if (realtimeStatus === 'online') {
    return {
      disabled: false,
      className: 'w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-[#16a34a] text-white',
    };
  }
  if (realtimeStatus === 'busy') {
    return {
      disabled: true,
      className:
        'w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-[#f97316] text-white opacity-80',
    };
  }
  return {
    disabled: true,
    className: 'w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-[#e5e5e5] text-[#666666]',
  };
}
