'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { animate } from 'animejs';

export function MaintenanceModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if the user has already acknowledged the maintenance warning
    const hasAcknowledged = localStorage.getItem('apicash_maintenance_ack');
    if (!hasAcknowledged) {
      setIsOpen(true);
      
      // Animate entry
      setTimeout(() => {
        animate('.maintenance-modal-overlay', {
          opacity: [0, 1],
          duration: 300,
          easing: 'easeOutQuad'
        });
        animate('.maintenance-modal-content', {
          scale: [0.9, 1],
          opacity: [0, 1],
          translateY: [20, 0],
          duration: 400,
          easing: 'easeOutCubic'
        });
      }, 100);
    }
  }, []);

  const handleClose = () => {
    // Animate exit
    animate('.maintenance-modal-overlay', {
      opacity: 0,
      duration: 200,
      easing: 'easeInQuad'
    });
    animate('.maintenance-modal-content', {
      scale: 0.95,
      opacity: 0,
      translateY: 10,
      duration: 250,
      easing: 'easeInCubic',
      onComplete: () => {
        localStorage.setItem('apicash_maintenance_ack', 'true');
        setIsOpen(false);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 maintenance-modal-overlay opacity-0 bg-background/80 backdrop-blur-sm">
      <div className="bg-card text-card-foreground w-full max-w-md rounded-2xl shadow-xl border border-border p-6 maintenance-modal-content opacity-0">
        
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 mb-4 mx-auto">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
        </div>

        <h2 className="text-xl font-bold text-center mb-2">Aviso de Mantenimiento</h2>
        
        <div className="space-y-3 text-muted-foreground text-sm mb-6 text-center">
          <p>
            Estamos realizando <strong>correcciones profundas y actualizaciones de arquitectura</strong> en la contabilidad y los registros del sistema.
          </p>
          <p>
            Hemos implementado un nuevo motor matemático estricto para calcular las comisiones bancarias y asegurar que no haya errores de precisión.
          </p>
          <p>
            Es posible que observe comportamientos inusuales mientras migramos la base de datos de producción a esta nueva versión. Agradecemos su paciencia.
          </p>
        </div>

        <button
          onClick={handleClose}
          className="w-full flex items-center justify-center px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Entendido, continuar
        </button>
      </div>
    </div>
  );
}