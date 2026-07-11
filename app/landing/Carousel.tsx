'use client';

import { useState, useEffect } from 'react';
import styles from './carousel.module.css';

interface CarouselProps {
  images: string[];
}

const fallbacks = [
  'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80', // Transporte / Camiones
  'https://images.unsplash.com/photo-1518364538800-6bcb3f25da49?auto=format&fit=crop&w=800&q=80', // Dashboard / Control
  'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?auto=format&fit=crop&w=800&q=80'  // Flota / Vehículos logística
];

export default function Carousel({ images }: CarouselProps) {
  const [current, setCurrent] = useState(0);
  const [loadedImages, setLoadedImages] = useState<string[]>(images);

  useEffect(() => {
    setLoadedImages(images);
  }, [images]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % loadedImages.length);
    }, 4000); // Rotación automática cada 4 segundos para mejor dinamismo

    return () => clearInterval(interval);
  }, [loadedImages]);

  const goToSlide = (index: number) => {
    setCurrent(index);
  };

  const handleImageError = (index: number) => {
    setLoadedImages((prev) => {
      const next = [...prev];
      next[index] = fallbacks[index % fallbacks.length];
      return next;
    });
  };

  return (
    <div className={styles.carousel}>
      <div className={styles.slides}>
        {loadedImages.map((image, index) => (
          <div
            key={index}
            className={`${styles.slide} ${index === current ? styles.active : ''}`}
          >
            <img 
              src={image} 
              alt={`Banner ${index + 1}`} 
              onError={() => handleImageError(index)}
            />
          </div>
        ))}
      </div>

      <div className={styles.dots}>
        {loadedImages.map((_, index) => (
          <button
            key={index}
            className={`${styles.dot} ${index === current ? styles.activeDot : ''}`}
            onClick={() => goToSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
