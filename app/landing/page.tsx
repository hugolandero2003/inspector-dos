'use client';

import { useEffect, useState } from 'react';
import styles from "./landing.module.css";
import { LeadForm } from "./LeadForm";
import Carousel from "./Carousel";
import { ValidationIllustration, PrivateAccessIllustration } from "./SectionIllustrations";

const carouselImages = [
  '/carousel-images/imagen 1.png',
  '/carousel-images/imagen 2.png',
  '/carousel-images/imagen 3.png',
  '/carousel-images/imagen 4.png',
  '/carousel-images/imagen 5.png',
  '/carousel-images/imagen 6.png',
  '/carousel-images/imagen 7.png'
];

export default function LandingPage() {
  const [scrollOpacity, setScrollOpacity] = useState(1);

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      const heroHeight = window.innerHeight - 70;

      const newOpacity = Math.max(0, 1 - currentScroll / (heroHeight * 0.8));
      setScrollOpacity(newOpacity);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <main className={styles.page}>
      {/* NAVIGATION */}
      <header className={styles.navWrap}>
        <nav className={styles.nav}>
          <a className={styles.brand}>Inspector PESV</a>
          <div className={styles.navLinks}>
            <a href="#problema" className={styles.navLink}>¿Por qué digitalizarse?</a>
            <a href="#solucion" className={styles.navLink}>Qué incluye</a>
            <a href="#proceso" className={styles.navLink}>Cómo empezar</a>
          </div>
          <div className={styles.navActions}>
            <a href="/login" className={styles.navLogin}>Iniciar sesión</a>
            <a href="/registro" className={styles.navCta}>Regístrate</a>
          </div>
        </nav>
      </header>

      {/* HERO SECTION */}
      <section 
        className={styles.hero}
        style={{ '--scroll-opacity': scrollOpacity } as React.CSSProperties}
      >
        <div className={styles.heroContent}>
          <p className={styles.heroTag}>Inspecciones digitales en tiempo real</p>
          <h1 className={styles.heroTitle}>
            Preoperacionales en la nube. Sin papel, sin retrasos.
          </h1>
          <p className={styles.heroText}>
            De inspecciones dispersas a un sistema centralizado, trazable y listo para auditoría. Tu operation segura, visible y escalable.
          </p>
          <div className={styles.heroCtas}>
            <a href="/registro" className={styles.btnPrimary}>Prueba gratis 8 días</a>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <Carousel images={carouselImages} />
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section id="problema" className={`${styles.section} ${styles.problemSection}`}>
        <div className={styles.sectionHeader}>
          <h2>El problema: Gestión ineficiente y multas</h2>
          <p className={styles.sectionDesc}>La falta de digitalización y el incumplimiento normativo ponen en riesgo constante tu operación de transporte y la seguridad vial.</p>
        </div>
        
        <div className={styles.problemGrid}>
          <div className={styles.problemCard}>
            <div className={styles.problemNumber}>01</div>
            <div>
              <h4>Formatos y dispersión</h4>
              <p>Inspecciones en papel mojado, planillas refundidas o fotos por chat. Imposible consolidar reportes rápidos o ver datos en tiempo real.</p>
            </div>
          </div>
          <div className={styles.problemCard}>
            <div className={styles.problemNumber}>02</div>
            <div>
              <h4>Retrasos y demoras</h4>
              <p>Mapear, transcribir y firmar inspecciones a mano toma horas de trabajo. Las aprobaciones lentas estancan tus vehículos y retrasan las rutas.</p>
            </div>
          </div>
          <div className={styles.problemCard}>
            <div className={styles.problemNumber}>03</div>
            <div>
              <h4>Vacíos de trazabilidad</h4>
              <p>Sin respaldo verídico de quién aprobó la inspección diaria de cada carro. Alta vulnerabilidad ante incidentes o accidentes de tránsito.</p>
            </div>
          </div>
          <div className={styles.problemCard}>
            <div className={styles.problemNumber}>04</div>
            <div>
              <h4>Riesgo de sanciones</h4>
              <p>El Ministerio impone duras multas ante inspecciones dudosas. Cumplir con la <strong>Resolución 40595 de 2022 (PESV)</strong> es obligatorio; nuestro sistema digitalizado garantiza que cada registro cumpla al 100% las exigencias de ley.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SOLUTION SECTION */}
      <section id="solucion" className={`${styles.section} ${styles.solutionSection}`}>
        <div className={styles.solutionContent}>
          <div className={styles.solutionText}>
            <h2>La solución: Un sistema centralizado y automático</h2>
            <p className={styles.solutionIntro}>Todo en un solo lugar. Inspecciones digitales, validación automática, acceso controlado y reporte en tiempo real.</p>
            
            <div className={styles.solutionBenefits}>
              <div className={styles.benefit}>
                <div className={styles.benefitIcon}>✓</div>
                <div>
                  <h4>Captura instantánea</h4>
                  <p>Los conductores llenan preoperacionales desde el celular, y sincroniza automáticamente.</p>
                </div>
              </div>
              
              <div className={styles.benefit}>
                <div className={styles.benefitIcon}>✓</div>
                <div>
                  <h4>Validación en tiempo real</h4>
                  <p>Cada inspección se valida automáticamente. Foto, fecha, responsable y estado quedan registrados.</p>
                </div>
              </div>
              
              <div className={styles.benefit}>
                <div className={styles.benefitIcon}>✓</div>
                <div>
                  <h4>Decisiones al instante</h4>
                  <p>Dashboard centralizado con todas las inspecciones. Supervisores aprueban en minutos, no en horas.</p>
                </div>
              </div>
              
              <div className={styles.benefit}>
                <div className={styles.benefitIcon}>✓</div>
                <div>
                  <h4>Cumplimiento garantizado</h4>
                  <p>Trazabilidad completa. Los auditores ven quién, cuándo y qué se aprobó. Demostración automática.</p>
                </div>
              </div>
            </div>

            <button className={styles.btnPrimarySolution}>Descubre cómo funciona</button>
          </div>

          <div className={styles.solutionVisual}>
            <img 
              src="/carousel-images/imagen la solucion.jpg" 
              alt="Solución digital preoperacionales" 
              className={styles.solutionImg}
            />
          </div>
        </div>
      </section>

      {/* PROCESS SECTION */}
      <section id="proceso" className={`${styles.section} ${styles.processSection}`}>
        <div className={styles.sectionHeader}>
          <h2>Cómo funciona nuestro software: Flujo sin fisuras</h2>
          <p className={styles.sectionDesc}>Un ecosistema robusto diseñado para digitalizar tus operaciones y blindar legalmente el PESV.</p>
        </div>
        
        <div className={styles.processGrid}>
          <div className={styles.processStep}>
            <div className={styles.stepNumber}>1</div>
            <div>
              <h4>Formulario de Encabezado y Checklist</h4>
              <p>El conductor inicia registrando la placa en el <strong>Formulario de Encabezado</strong> (que valida datos principales, kilometraje y conductor) y procede a completar el <strong>Checklist visual</strong> de inspección técnica en segundos, incluso si está en zonas sin señal.</p>
            </div>
          </div>

          <div className={styles.processStep}>
            <div className={styles.stepNumber}>2</div>
            <div>
              <h4>Almacenamiento Seguro e Inmutable</h4>
              <p>Toda la información capturada, firmas y registros fotográficos se consolidan y guardan automáticamente en nuestra <strong>base de datos segura en la nube</strong>. Esto garantiza un respaldo inmediato, protegiendo los registros contra pérdidas y permitiendo exportar descargas PDF oficiales al instante.</p>
            </div>
          </div>

          <div className={styles.processStep}>
            <div className={styles.stepNumber}>3</div>
            <div>
              <h4>Panel de Control Administrativo</h4>
              <p>El supervisor o líder del PESV accede al <strong>Panel Administrativo</strong> en tiempo real para monitorear el estado de la flota, auditar históricos, gestionar carros no aptos, y descargar informes listos para auditorías del Ministerio de Transporte.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className={styles.ctaSection}>
        <h2>¿Listo para mejorar tus operaciones?</h2>
        <p>Acceso completamente funcional durante 8 días. Sin tarjeta de crédito. Sin compromisos.</p>
        <a href="/registro" className={styles.ctaButton}>Solicitar prueba gratis</a>
      </section>

      {/* STATS SECTION */}
      <section className={`${styles.section} ${styles.statsSection}`}>
        <div className={styles.sectionHeader}>
          <h2 style={{color: 'var(--text-primary)'}}>Resultados reales de usuarios</h2>
        </div>
        
        <div className={styles.statsGrid}>
          <div className={styles.statBox}>
            <div className={styles.statNumber}>-61%</div>
            <div className={styles.statLabel}>Menos tiempo consolidando datos</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statNumber}>+94%</div>
            <div className={styles.statLabel}>Aumento en trazabilidad</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statNumber}>3x</div>
            <div className={styles.statLabel}>Más rápido activar vehículos</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statNumber}>100%</div>
            <div className={styles.statLabel}>Cumplimiento en auditoría</div>
          </div>
        </div>
      </section>

      {/* FORM SECTION */}
      <section id="contacto" className={styles.section}>
        <div className={styles.formSection}>
          <div className={styles.formTitle}>
            <h2 className={styles.sectionTitle}>Cuéntanos de tu operación</h2>
            <p className={styles.sectionDesc}>Te compartimos el acceso correcto en 24 horas. Sin llamadas de ventas.</p>
          </div>
          <LeadForm />
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerBottom}>
          <p>© 2026 Inspector PESV. Todos los derechos reservados. Desarrollado por <strong>HALM</strong>.</p>
        </div>
      </footer>
    </main>
  );
}  
