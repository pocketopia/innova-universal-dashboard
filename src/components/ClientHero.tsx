interface ClientHeroProps {
  isDelivered: boolean;
  project: any;
}

export default function ClientHero({ isDelivered, project }: ClientHeroProps) {
  return (
    <div className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 premium-gradient" />
      
      {/* Animated particles/overlay */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {isDelivered ? (
          <>
            <p className="text-gold/80 text-[10px] uppercase tracking-[0.3em] font-mono mb-4">
              Digital Master Delivered
            </p>
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6 tracking-wide">
              {project?.title || 'Your Premiere Awaits'}
            </h1>
            <p className="text-gray-400 text-sm md:text-base font-light max-w-2xl mx-auto leading-relaxed">
              {project?.description || 'Your secure digital presentation has been prepared.'}
            </p>
          </>
        ) : (
          <>
            <p className="text-gold/80 text-[10px] uppercase tracking-[0.3em] font-mono mb-4">
              Secure Client Portal
            </p>
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6 tracking-wide">
              Welcome to Your Premiere
            </h1>
            <p className="text-gray-400 text-sm md:text-base font-light max-w-2xl mx-auto leading-relaxed">
              Enter your secure handshake code to unlock your exclusive digital presentation.
            </p>
          </>
        )}
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cinemablack to-transparent" />
    </div>
  );
}