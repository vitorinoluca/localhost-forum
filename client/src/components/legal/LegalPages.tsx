import type { ReactNode } from 'react';
import type { Route } from '../../types';
import {
  getContactEmail,
  getLegalJurisdictionClause,
  getSiteOperatorLabel,
} from '../../lib/site-legal';

function LegalShell({
  title,
  navigate,
  children,
}: {
  title: string;
  navigate: (route: Route) => void;
  children: ReactNode;
}) {
  return (
    <article className='mx-auto min-h-[60vh] max-w-3xl px-6 py-12'>
      <button
        className='mb-10 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 transition hover:text-white'
        type='button'
        onClick={() => navigate('/')}
      >
        ← Inicio
      </button>
      <h1 className='font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl'>{title}</h1>
      <div className='mt-10 space-y-8 text-sm leading-relaxed text-neutral-300'>{children}</div>
    </article>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className='text-xs font-bold uppercase tracking-[0.2em] text-white'>{children}</h2>
  );
}

export function TermsPage({ navigate }: { navigate: (route: Route) => void }) {
  const operator = getSiteOperatorLabel();
  const jurisdiction = getLegalJurisdictionClause();

  return (
    <LegalShell navigate={navigate} title='Términos del servicio'>
      <section className='space-y-3'>
        <SectionTitle>1. Objeto</SectionTitle>
        <p>
          <strong className='text-neutral-200'>localhost:forum</strong> es un servicio en línea de
          participación (foro o tablero de publicaciones) operado por {operator}. El uso del sitio
          implica la aceptación de estos términos.
        </p>
      </section>

      <section className='space-y-3'>
        <SectionTitle>2. Naturaleza del servicio</SectionTitle>
        <p>
          El servicio se ofrece en el estado en que se encuentre, sin garantía de disponibilidad
          continua, exactitud de los contenidos ni idoneidad para un fin concreto.
        </p>
      </section>

      <section className='space-y-3'>
        <SectionTitle>3. Cuenta y elegibilidad</SectionTitle>
        <p>
          Para usar ciertas funciones debés crear una cuenta con datos veraces. Sos responsable de
          mantener la confidencialidad de tu acceso y de toda actividad realizada con tu cuenta. Podés
          dar de baja el uso del servicio dejando de utilizarlo o solicitando la eliminación cuando
          el sitio ofrezca esa opción o por los medios de contacto indicados.
        </p>
      </section>

      <section className='space-y-3'>
        <SectionTitle>4. Uso aceptable</SectionTitle>
        <p>
          Te comprometés a no utilizar el servicio para fines ilícitos o que lesionen derechos de
          terceros. Entre otras conductas, queda prohibido publicar, enlazar o facilitar: contenido
          ilegal; acoso, odio o violencia; pornografía infantil; malware o spam; suplantación de
          identidad; vulneración de secretos o datos personales de terceros sin base legal; ni
          cualquier actividad que interfiera con el funcionamiento del sitio o de redes ajenas.
        </p>
      </section>

      <section className='space-y-3'>
        <SectionTitle>5. Contenidos de usuarios</SectionTitle>
        <p>
          Los textos, imágenes y demás aportes son responsabilidad de quien los publica. Al publicar
          declarás que tenés los derechos necesarios o que el uso está permitido. No nos hacemos
          responsables por el contenido generado por usuarios, sin perjuicio de las medidas que la ley
          o la moderación habiliten en cada caso.
        </p>
      </section>

      <section className='space-y-3'>
        <SectionTitle>6. Moderación</SectionTitle>
        <p>
          Podemos retirar contenidos, suspender cuentas o limitar el acceso cuando existan indicios
          razonables de incumplimiento de estos términos o de la normativa aplicable. Las decisiones
          pueden ser automatizadas o manuales y no obligan a una respuesta previa en todos los casos.
        </p>
      </section>

      <section className='space-y-3'>
        <SectionTitle>7. Propiedad intelectual</SectionTitle>
        <p>
          La estructura del sitio, marcas distintivas y elementos propios del operador están protegidos
          por las leyes aplicables. Los contenidos de usuarios siguen siendo de sus autores; nos
          concedés una licencia no exclusiva, mundial y gratuita para alojarlos, mostrarlos y
          reproducirlos en la medida necesaria para operar el servicio.
        </p>
      </section>

      <section className='space-y-3'>
        <SectionTitle>8. Limitación de responsabilidad</SectionTitle>
        <p>
          En la máxima medida permitida por la ley, {operator} no será responsable por daños
          indirectos, lucro cesante, pérdida de datos o daños derivados del uso o la imposibilidad de
          uso del servicio. El uso es bajo tu propio riesgo.
        </p>
      </section>

      <section className='space-y-3'>
        <SectionTitle>9. Indemnización</SectionTitle>
        <p>
          Te comprometés a mantener indemne a {operator} frente a reclamaciones de terceros
          derivadas de tu uso indebido del servicio o de tus contenidos, incluyendo honorarios
          razonables de defensa cuando corresponda.
        </p>
      </section>

      <section className='space-y-3'>
        <SectionTitle>10. Enlaces</SectionTitle>
        <p>
          El sitio puede incluir enlaces externos. No controlamos esos sitios ni sus políticas; su uso
          es bajo tu responsabilidad.
        </p>
      </section>

      <section className='space-y-3'>
        <SectionTitle>11. Ley aplicable</SectionTitle>
        <p>
          Para la interpretación de estos términos se tendrá en cuenta {jurisdiction}. Los tribunales
          competentes serán los que correspondan según la normativa aplicable o, en su defecto, los del
          domicilio del operador.
        </p>
      </section>

      <section className='space-y-3'>
        <SectionTitle>12. Cambios</SectionTitle>
        <p>
          Podemos actualizar estos términos publicando la nueva versión en el sitio. El uso continuado
          tras cambios relevantes puede considerarse aceptación salvo que la ley exija otro
          procedimiento.
        </p>
      </section>

      <section className='space-y-3'>
        <SectionTitle>13. Contacto</SectionTitle>
        <p>
          Para consultas sobre estos términos usá la sección{' '}
          <button
            className='text-[#3b82f6] underline decoration-[#3b82f6]/40 underline-offset-2 hover:text-[#93c5fd]'
            type='button'
            onClick={() => navigate('/contact')}
          >
            Contacto
          </button>
          .
        </p>
      </section>
    </LegalShell>
  );
}

export function PrivacyPage({ navigate }: { navigate: (route: Route) => void }) {
  const operator = getSiteOperatorLabel();

  return (
    <LegalShell navigate={navigate} title='Privacidad'>
      <section className='space-y-3'>
        <SectionTitle>Responsable</SectionTitle>
        <p>
          Responsable del tratamiento de datos personales en este sitio: {operator}. Podés solicitar
          aclaraciones o ejercer derechos mediante los medios indicados en{' '}
          <button
            className='text-[#3b82f6] underline decoration-[#3b82f6]/40 underline-offset-2 hover:text-[#93c5fd]'
            type='button'
            onClick={() => navigate('/contact')}
          >
            Contacto
          </button>
          .
        </p>
      </section>

      <section className='space-y-3'>
        <SectionTitle>Datos que podemos tratar</SectionTitle>
        <p>
          Datos de registro e identificación (nombre, correo electrónico o identificadores de
          proveedores de inicio de sesión si los hubiera); contenido que publiques (textos, imágenes,
          comentarios); datos técnicos habituales (dirección IP, tipo de navegador, rutas visitadas) para
          seguridad y estadísticas agregadas; y cookies o almacenamiento local necesarios para la
          sesión y el funcionamiento del sitio.
        </p>
      </section>

      <section className='space-y-3'>
        <SectionTitle>Finalidades</SectionTitle>
        <p>
          Gestionar cuentas y autenticación; permitir la participación en el foro; comunicaciones
          relacionadas con el servicio (p. ej. verificación de correo); moderación y seguridad;
          cumplimiento legal; y mejora del servicio mediante datos agregados cuando no identifiquen a
          personas de forma directa.
        </p>
      </section>

      <section className='space-y-3'>
        <SectionTitle>Conservación</SectionTitle>
        <p>
          Los datos se conservan mientras la cuenta esté activa o sea necesario para las finalidades
          indicadas y los plazos legales aplicables. Podés solicitar supresión cuando proceda
          conforme a la ley.
        </p>
      </section>

      <section className='space-y-3'>
        <SectionTitle>Destinatarios</SectionTitle>
        <p>
          Podemos utilizar proveedores de alojamiento, base de datos, correo transaccional o
          almacenamiento de archivos. Esos encargados tratan datos solo siguiendo instrucciones y con
          medidas contractuales adecuadas.
        </p>
      </section>

      <section className='space-y-3'>
        <SectionTitle>Derechos</SectionTitle>
        <p>
          Según tu lugar de residencia y la normativa aplicable, podrías tener derecho a acceder,
          rectificar, suprimir u oponerte al tratamiento, limitarlo o solicitar portabilidad. Podés
          contactarnos para ejercerlos; si considerás que no se atendió adecuadamente, podés recurrir
          ante la autoridad de protección de datos que corresponda.
        </p>
      </section>

      <section className='space-y-3'>
        <SectionTitle>Seguridad</SectionTitle>
        <p>
          Aplicamos medidas razonables (técnicas y organizativas) para proteger los datos. Ningún
          sistema es invulnerable; si detectás un problema informanos por los canales de contacto.
        </p>
      </section>

      <section className='space-y-3'>
        <SectionTitle>Menores</SectionTitle>
        <p>
          El servicio no está dirigido a menores de edad según la legislación aplicable. Si sos padre,
          madre o tutor y creés que un menor nos facilitó datos, escribinos para adoptar las medidas
          oportunas.
        </p>
      </section>

      <section className='space-y-3'>
        <SectionTitle>Cambios</SectionTitle>
        <p>
          Esta información puede actualizarse; la versión vigente es la publicada en esta página.
        </p>
      </section>
    </LegalShell>
  );
}

export function ContactPage({ navigate }: { navigate: (route: Route) => void }) {
  const email = getContactEmail();

  return (
    <LegalShell navigate={navigate} title='Contacto'>
      <p>
        Para consultas sobre el funcionamiento del sitio, privacidad o estos términos, podés
        comunicarte con {getSiteOperatorLabel()} por los medios siguientes.
      </p>

      {email ? (
        <section className='space-y-3'>
          <SectionTitle>Correo electrónico</SectionTitle>
          <p>
            <a
              className='font-mono text-[#3b82f6] underline decoration-[#3b82f6]/40 underline-offset-2 hover:text-[#93c5fd]'
              href={`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('localhost:forum — consulta')}`}
            >
              {email}
            </a>
          </p>
        </section>
      ) : (
        <section className='space-y-3'>
          <SectionTitle>Correo electrónico</SectionTitle>
          <p className='text-neutral-400'>
            Configurá{' '}
            <code className='rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-neutral-200'>
              VITE_CONTACT_EMAIL
            </code>{' '}
            en el build del cliente para mostrar un correo aquí.
          </p>
        </section>
      )}

      <section className='space-y-3'>
        <SectionTitle>Respuesta</SectionTitle>
        <p>
          Las respuestas se envían cuando sea posible, sin plazo fijo ni obligación de soporte
          comercial.
        </p>
      </section>

      <p className='text-xs text-neutral-500'>
        Para incidencias urgentes de seguridad (vulnerabilidades, filtraciones), indicá &quot;seguridad&quot;
        en el asunto del mensaje.
      </p>
    </LegalShell>
  );
}
