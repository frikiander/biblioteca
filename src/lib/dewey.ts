export interface DeweyCategory {
  code: string;
  name: string;
  description: string;
  color: string;
  badgeBg: string;
  badgeText: string;
}

export interface DeweyDivision {
  code: string;
  name: string;
  classCode: string;
}

export interface DeweyClassGroup {
  code: string;
  name: string;
  description: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  divisions: DeweyDivision[];
}

export const DEWEY_GROUPS: DeweyClassGroup[] = [
  {
    code: '000',
    name: '000 Generalidades',
    description: 'Aquí encontrará ayuda para las tareas escolares: diccionarios, enciclopedias y todo acerca de las computadoras.',
    color: '#475569',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    divisions: [
      { code: '000', name: '000 Generalidades', classCode: '000' },
      { code: '010', name: '010 Bibliografía', classCode: '000' },
      { code: '020', name: '020 Bibliotecología y ciencias de la información', classCode: '000' },
      { code: '030', name: '030 Enciclopedias generales', classCode: '000' },
      { code: '050', name: '050 Publicaciones en serie', classCode: '000' },
      { code: '060', name: '060 Organizaciones y museografía', classCode: '000' },
      { code: '070', name: '070 Periodismo, editoriales, diarios', classCode: '000' },
      { code: '080', name: '080 Colecciones generales', classCode: '000' },
      { code: '090', name: '090 Manuscritos y libros raros', classCode: '000' },
    ],
  },
  {
    code: '100',
    name: '100 Filosofía y psicología',
    description: '¿Quiere aprender acerca de las grandes preguntas de la humanidad? Aquí encontrará toda la información.',
    color: '#6366f1',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    divisions: [
      { code: '100', name: '100 Filosofía y psicología', classCode: '100' },
      { code: '110', name: '110 Metafísica', classCode: '100' },
      { code: '120', name: '120 Conocimiento, causa, fin, hombre', classCode: '100' },
      { code: '130', name: '130 Parapsicología, ocultismo, fenómenos paranormales', classCode: '100' },
      { code: '140', name: '140 Escuelas filosóficas específicas', classCode: '100' },
      { code: '150', name: '150 Psicología', classCode: '100' },
      { code: '160', name: '160 Lógica', classCode: '100' },
      { code: '170', name: '170 Ética (filosofía moral)', classCode: '100' },
      { code: '180', name: '180 Filosofía antigua, medieval, oriental', classCode: '100' },
      { code: '190', name: '190 Filosofía moderna occidental', classCode: '100' },
    ],
  },
  {
    code: '200',
    name: '200 Religión',
    description: 'Aprenda acerca de las diferentes religiones del mundo.',
    color: '#8b5cf6',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    divisions: [
      { code: '200', name: '200 Religión', classCode: '200' },
      { code: '210', name: '210 Filosofía y teoría de la religión', classCode: '200' },
      { code: '220', name: '220 Biblia', classCode: '200' },
      { code: '230', name: '230 Teología cristiana', classCode: '200' },
      { code: '240', name: '240 Moral y prácticas cristianas', classCode: '200' },
      { code: '250', name: '250 Iglesia local y órdenes religiosas', classCode: '200' },
      { code: '260', name: '260 Teología social y eclesiástica', classCode: '200' },
      { code: '270', name: '270 Historia y geografía de la iglesia cristiana', classCode: '200' },
      { code: '280', name: '280 Credos y sectas de la iglesia cristiana', classCode: '200' },
      { code: '290', name: '290 Otras religiones', classCode: '200' },
    ],
  },
  {
    code: '300',
    name: '300 Ciencias sociales',
    description: 'Aquí encontrará información acerca de economía, negocios, política, profesiones, gobierno, leyes y educación.',
    color: '#0284c7',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    divisions: [
      { code: '300', name: '300 Ciencias sociales', classCode: '300' },
      { code: '310', name: '310 Estadística', classCode: '300' },
      { code: '320', name: '320 Ciencia política', classCode: '300' },
      { code: '330', name: '330 Economía', classCode: '300' },
      { code: '340', name: '340 Derecho', classCode: '300' },
      { code: '350', name: '350 Administración pública y ciencia militar', classCode: '300' },
      { code: '360', name: '360 Problemas y servicios sociales', classCode: '300' },
      { code: '370', name: '370 Educación', classCode: '300' },
      { code: '380', name: '380 Comercio, comunicaciones y transporte', classCode: '300' },
      { code: '390', name: '390 Costumbres y folklore', classCode: '300' },
    ],
  },
  {
    code: '400',
    name: '400 Lenguas',
    description: '¿Quiere aprender inglés o necesita ayuda con un idioma extranjero? Aquí encontrará toda la ayuda que busca.',
    color: '#0d9488',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-700',
    divisions: [
      { code: '400', name: '400 Lenguas', classCode: '400' },
      { code: '410', name: '410 Lingüística', classCode: '400' },
      { code: '420', name: '420 Inglés e inglés antiguo', classCode: '400' },
      { code: '430', name: '430 Lenguas germánicas; alemán', classCode: '400' },
      { code: '440', name: '440 Lenguas romances; francés', classCode: '400' },
      { code: '450', name: '450 Italiano, rumano, rético', classCode: '400' },
      { code: '460', name: '460 Español y portugués', classCode: '400' },
      { code: '470', name: '470 Lenguas itálicas; latín', classCode: '400' },
      { code: '480', name: '480 Lenguas helénicas; griego clásico', classCode: '400' },
      { code: '490', name: '490 Otras lenguas', classCode: '400' },
    ],
  },
  {
    code: '500',
    name: '500 Matemáticas y ciencias naturales',
    description: 'Aquí aprenderá acerca de plantas, animales, matemáticas, planetas, etc.',
    color: '#16a34a',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    divisions: [
      { code: '500', name: '500 Matemáticas y ciencias naturales', classCode: '500' },
      { code: '510', name: '510 Matemáticas', classCode: '500' },
      { code: '520', name: '520 Astronomía y ciencias afines', classCode: '500' },
      { code: '530', name: '530 Física', classCode: '500' },
      { code: '540', name: '540 Química y ciencias afines', classCode: '500' },
      { code: '550', name: '550 Geociencias', classCode: '500' },
      { code: '560', name: '560 Paleontología. paleozoología', classCode: '500' },
      { code: '570', name: '570 Ciencias biológicas', classCode: '500' },
      { code: '580', name: '580 Ciencias botánicas', classCode: '500' },
      { code: '590', name: '590 Ciencias zoológicas', classCode: '500' },
    ],
  },
  {
    code: '600',
    name: '600 Tecnología y ciencias aplicadas',
    description: 'Infórmese acerca de la salud, el embarazo, la construcción, la carpintería, la cocina y cómo funciona su automóvil.',
    color: '#d97706',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    divisions: [
      { code: '600', name: '600 Tecnología y ciencias aplicadas', classCode: '600' },
      { code: '610', name: '610 Ciencias médicas', classCode: '600' },
      { code: '620', name: '620 Ingeniería y operaciones afines', classCode: '600' },
      { code: '630', name: '630 Agricultura y tecnologías afines', classCode: '600' },
      { code: '640', name: '640 Economía doméstica', classCode: '600' },
      { code: '650', name: '650 Servicios administrativos empresariales', classCode: '600' },
      { code: '660', name: '660 Química industrial', classCode: '600' },
      { code: '670', name: '670 Manufacturas', classCode: '600' },
      { code: '680', name: '680 Manufacturas varias', classCode: '600' },
      { code: '690', name: '690 Construcciones', classCode: '600' },
    ],
  },
  {
    code: '700',
    name: '700 Artes',
    description: 'Si le gusta el arte, el diseño interior, la música o los deportes aquí encontrará lo que busca.',
    color: '#e11d48',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    divisions: [
      { code: '700', name: '700 Artes', classCode: '700' },
      { code: '710', name: '710 Urbanismo y arquitectura del paisaje', classCode: '700' },
      { code: '720', name: '720 Arquitectura', classCode: '700' },
      { code: '730', name: '730 Artes plásticas; escultura', classCode: '700' },
      { code: '740', name: '740 Dibujo, artes decorativas', classCode: '700' },
      { code: '750', name: '750 Pintura y pinturas', classCode: '700' },
      { code: '760', name: '760 Artes gráficas; grabados', classCode: '700' },
      { code: '770', name: '770 Fotografía y fotografías', classCode: '700' },
      { code: '780', name: '780 Música', classCode: '700' },
      { code: '790', name: '790 Entretenimiento', classCode: '700' },
    ],
  },
  {
    code: '800',
    name: '800 Literatura',
    description: 'Aquí encontrará drama, poemas y crítica literaria de alrededor del mundo',
    color: '#2563eb',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    divisions: [
      { code: '800', name: '800 Literatura', classCode: '800' },
      { code: '810', name: '810 Literatura americana en inglés', classCode: '800' },
      { code: '820', name: '820 Literatura inglesa e inglesa antigua', classCode: '800' },
      { code: '830', name: '830 Literaturas germánicas', classCode: '800' },
      { code: '840', name: '840 Literaturas de las lenguas romances', classCode: '800' },
      { code: '850', name: '850 Literaturas italiana, rumana', classCode: '800' },
      { code: '860', name: '860 Literaturas española y portuguesa', classCode: '800' },
      { code: '870', name: '870 Literaturas de las lenguas itálicas', classCode: '800' },
      { code: '880', name: '880 Literaturas de las lenguas helénicas', classCode: '800' },
      { code: '890', name: '890 Literaturas de otras lenguas', classCode: '800' },
    ],
  },
  {
    code: '900',
    name: '900 Historia y geografía',
    description: 'Viaje alrededor del mundo, aprenda la historia de los países',
    color: '#9333ea',
    badgeBg: 'bg-fuchsia-50',
    badgeText: 'text-fuchsia-700',
    divisions: [
      { code: '900', name: '900 Historia y geografía', classCode: '900' },
      { code: '910', name: '910 Geografía; viajes', classCode: '900' },
      { code: '920', name: '920 Biografía y genealogía', classCode: '900' },
      { code: '930', name: '930 Historia del mundo antiguo', classCode: '900' },
      { code: '940', name: '940 Historia de Europa', classCode: '900' },
      { code: '950', name: '950 Historia de Asia', classCode: '900' },
      { code: '960', name: '960 Historia de África', classCode: '900' },
      { code: '970', name: '970 Historia de América del Norte', classCode: '900' },
      { code: '980', name: '980 Historia de América del Sur', classCode: '900' },
      { code: '990', name: '990 Historia de otras regiones', classCode: '900' },
    ],
  },
];

// Major class record for quick lookups
export const DEWEY_CLASSES: Record<string, DeweyCategory> = DEE_GROUPS_TO_MAP(DEWEY_GROUPS);

function DEE_GROUPS_TO_MAP(groups: DeweyClassGroup[]): Record<string, DeweyCategory> {
  const map: Record<string, DeweyCategory> = {};
  groups.forEach((g) => {
    map[g.code] = {
      code: g.code,
      name: g.name,
      description: g.description,
      color: g.color,
      badgeBg: g.badgeBg,
      badgeText: g.badgeText,
    };
  });
  return map;
}

// Flat lookup for all divisions
export const ALL_DEWEY_DIVISIONS: DeweyDivision[] = DEWEY_GROUPS.flatMap((g) => g.divisions);

export function getDeweyInfo(deweyCode: string): DeweyCategory {
  if (!deweyCode) {
    return DEWEY_CLASSES['800'] || {
      code: '800',
      name: '800 Literatura',
      description: 'Aquí encontrará drama, poemas y crítica literaria de alrededor del mundo',
      color: '#2563eb',
      badgeBg: 'bg-blue-50',
      badgeText: 'text-blue-700',
    };
  }

  const raw = deweyCode.trim();
  const cleanCode = raw.split('.')[0].replace(/[^0-9]/g, '');
  const padded = cleanCode.padEnd(3, '0').slice(0, 3);
  const hundredPrefix = padded.charAt(0) + '00';
  const group = DEWEY_GROUPS.find((g) => g.code === hundredPrefix) || DEWEY_GROUPS[8];

  // Look for exact division match (e.g., '860')
  const division = ALL_DEWEY_DIVISIONS.find((d) => d.code === padded) ||
                   ALL_DEWEY_DIVISIONS.find((d) => d.code === hundredPrefix);

  const displayName = division ? division.name : `${padded} ${group.name.replace(/^[0-9]+\s*/, '')}`;

  return {
    code: padded,
    name: displayName,
    description: group.description,
    color: group.color,
    badgeBg: group.badgeBg,
    badgeText: group.badgeText,
  };
}

