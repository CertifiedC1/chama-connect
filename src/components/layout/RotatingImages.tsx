const images = [
  {
    url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=300&h=400&fit=crop',
    title: 'Community Savings',
    subtitle: 'Strength in numbers'
  },
  {
    url: 'https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=300&h=400&fit=crop',
    title: 'Financial Growth',
    subtitle: 'Watch your wealth grow'
  },
  {
    url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=300&h=400&fit=crop',
    title: 'Mobile Payments',
    subtitle: 'M-Pesa integration'
  },
  {
    url: 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=300&h=400&fit=crop',
    title: 'Team Meetings',
    subtitle: 'Stay connected'
  },
  {
    url: 'https://images.unsplash.com/photo-1434626881859-194d67b2b86f?w=300&h=400&fit=crop',
    title: 'Investment Plans',
    subtitle: 'Smart decisions'
  }
];

export function RotatingImages() {
  return (
    <div className="w-full overflow-hidden py-6">
      <div className="flex animate-scroll gap-6">
        {/* Double the images for seamless loop */}
        {[...images, ...images].map((image, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-48 md:w-56 group"
          >
            <div className="relative h-64 md:h-72 rounded-xl overflow-hidden shadow-lg">
              <img
                src={image.url}
                alt={image.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h4 className="font-bold text-sm">{image.title}</h4>
                <p className="text-xs text-white/70">{image.subtitle}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
