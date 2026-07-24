'use client';

import { useState, useEffect } from 'react';
import styles from './carousel.module.css';

interface CarouselProps {
  images: string[];
}

const fallbacks = [
  '/carousel-images/imagen 1.png',
  '/carousel-images/imagen 2.png',
  '/carousel-images/imagen 3.png',
  '/carousel-images/imagen 4.png',
  '/carousel-images/imagen 5.png',
  '/carousel-images/imagen 6.png',
  '/carousel-images/imagen 7.png'
];   

export default function Carousel({ images }: CarouselProps) {
  const [current, setCurrent] = useState(0);
  const [loadedImages, setLoadedImages] = useState<string[]>(images);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    setLoadedImages(images);
  }, [images]);

  useEffect(() => {
    if (loadedImages.length === 0 || selectedImage) return;

    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % loadedImages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [loadedImages, selectedImage]);

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

  // Funciones para navegar en la ventana modal
  const navigateModal = (direction: 'prev' | 'next') => {
    if (!selectedImage) return;
    
    const currentIndex = loadedImages.indexOf(selectedImage);
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % loadedImages.length;
    } else {
      newIndex = (currentIndex - 1 + loadedImages.length) % loadedImages.length;
    }
    
    setSelectedImage(loadedImages[newIndex]);
  };

  return (
    <>
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
                onClick={() => setSelectedImage(image)}
                style={{ cursor: 'pointer' }}
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

      {/* Ventana modal con navegación por flechas */}
      {selectedImage && (
        <div 
          className={styles.modalOverlay} 
          onClick={() => setSelectedImage(null)}
        >
          {/* Flecha Izquierda */}
          <button 
            className={`${styles.navButton} ${styles.prevButton}`} 
            onClick={(e) => { e.stopPropagation(); navigateModal('prev'); }}
          >
            &#10094;
          </button>

          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage} alt="Imagen completa" className={styles.modalImage} />
            <button className={styles.closeButton} onClick={() => setSelectedImage(null)}>×</button>
          </div>

          {/* Flecha Derecha */}
          <button 
            className={`${styles.navButton} ${styles.nextButton}`} 
            onClick={(e) => { e.stopPropagation(); navigateModal('next'); }}
          >
            &#10095;
          </button>
        </div>
      )}
    </>
  );
}
