import { useEffect, useRef, useState } from 'react';
const IMG_STYLE = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  objectPosition: 'center 8%',
};

const STAGE_STYLE = {
  width: '100%',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 0,
  backgroundColor: 'transparent',
};

/**
 * Double buffer crossfade pour l'avatar Frizitta (37 signes uniformisés).
 */
export default function AvatarStage({ src }) {
  const imgARef = useRef(null);
  const imgBRef = useRef(null);
  const frontRef = useRef('A');
  const [front, setFront] = useState('A');
  const displayedRef = useRef('');

  useEffect(() => {
    if (!src || src === displayedRef.current) return;

    const back = frontRef.current === 'A' ? 'B' : 'A';
    const backEl = back === 'A' ? imgARef.current : imgBRef.current;

    const showBack = () => {
      displayedRef.current = src;
      frontRef.current = back;
      setFront(back);
    };

    if (!backEl) return;

    if (backEl.src === src && backEl.complete) {
      showBack();
      return;
    }

    const onLoad = () => {
      backEl.removeEventListener('load', onLoad);
      showBack();
    };

    backEl.addEventListener('load', onLoad);
    backEl.src = src;

    return () => backEl.removeEventListener('load', onLoad);
  }, [src]);

  useEffect(() => {
    if (!src || displayedRef.current) return;
    const el = imgARef.current;
    if (!el) return;
    el.src = src;
    displayedRef.current = src;
  }, [src]);

  const aVisible = front === 'A';
  const bVisible = front === 'B';

  return (
    <div className="avatar-stage-frizitta" style={STAGE_STYLE}>
      <img
        ref={imgARef}
        alt=""
        decoding="async"
        style={{
          ...IMG_STYLE,
          opacity: aVisible ? 1 : 0,
          transition: 'opacity 0.12s ease',
          zIndex: aVisible ? 2 : 1,
        }}
      />
      <img
        ref={imgBRef}
        alt=""
        decoding="async"
        style={{
          ...IMG_STYLE,
          opacity: bVisible ? 1 : 0,
          transition: 'opacity 0.12s ease',
          zIndex: bVisible ? 2 : 1,
        }}
      />
    </div>
  );
}
