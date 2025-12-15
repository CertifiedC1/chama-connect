import { useState, useEffect } from 'react';

const slides = [
  {
    url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=400&fit=crop',
    title: 'Grow Together',
    subtitle: 'Build your financial future with your community'
  },
  {
    url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200&h=400&fit=crop',
    title: 'Smart Savings',
    subtitle: 'Track every contribution automatically'
  },
  {
    url: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=1200&h=400&fit=crop',
    title: 'Secure Loans',
    subtitle: 'Access funds when you need them most'
  },
  {
    url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&h=400&fit=crop',
    title: 'M-Pesa Integrated',
    subtitle: 'Seamless mobile money payments'
  }
];

export function ImageSlideshow() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-[300px] md:h-[350px] rounded-2xl overflow-hidden shadow-lg">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={slide.url}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <h3 className="text-2xl md:text-3xl font-bold mb-2">{slide.title}</h3>
            <p className="text-sm md:text-base text-white/80">{slide.subtitle}</p>
          </div>
        </div>
      ))}

      {/* Dots indicator */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              index === currentSlide ? 'bg-primary' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
