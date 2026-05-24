/** Styles vidéo Alex — à appeler avant chaque `video.src = url`. */
export function applyAlexVideoStyles(video) {
  if (!video) return;
  video.style.position = 'absolute';
  video.style.top = '0';
  video.style.left = '0';
  video.style.width = '100%';
  video.style.height = '100%';
  video.style.objectFit = 'cover';
  video.style.objectPosition = 'center 8%';
  video.style.transform = 'none';
  video.style.backgroundColor = 'transparent';
}

const STAGE_STYLE = {
  width: '100%',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 0,
  backgroundColor: 'transparent',
};

const VIDEO_STYLE = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  objectPosition: 'center 8%',
  transform: 'none',
  backgroundColor: 'transparent',
};

/**
 * Conteneur portrait Alex (vidéo 16:9 en cover, cadrage tête/buste).
 */
export default function AlexStage({ videoARef, videoBRef, activeVideo }) {
  return (
    <div className="avatar-stage-alex" style={STAGE_STYLE} id="alex-player">
      <video
        ref={videoARef}
        id="video-A"
        autoPlay
        muted
        playsInline
        preload="auto"
        controls={false}
        style={{
          ...VIDEO_STYLE,
          opacity: activeVideo === 'A' ? 1 : 0,
          zIndex: activeVideo === 'A' ? 2 : 1,
          transition: 'opacity 0.05s',
        }}
      />
      <video
        ref={videoBRef}
        id="video-B"
        autoPlay
        muted
        playsInline
        preload="auto"
        controls={false}
        style={{
          ...VIDEO_STYLE,
          opacity: activeVideo === 'B' ? 1 : 0,
          zIndex: activeVideo === 'B' ? 2 : 1,
          transition: 'opacity 0.05s',
        }}
      />
    </div>
  );
}
