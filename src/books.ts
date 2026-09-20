/**
 * Bible book names, and the matching behind the suggestions in the Bible-text
 * field.
 *
 * People type a reference the short way — "ps 23", "1cor 13", "jn 3:16" — so
 * matching runs over a list of the abbreviations they actually write, not just
 * the full names. The names themselves are the 66 books of the Protestant
 * canon, which is what JIL Austria preaches from.
 */

type Book = { name: string; chapters: number; aliases: string[] };

const BOOKS: Book[] = [
  { name: 'Genesis', chapters: 50, aliases: ['gen', 'ge', 'gn'] },
  { name: 'Exodus', chapters: 40, aliases: ['ex', 'exo', 'exod'] },
  { name: 'Leviticus', chapters: 27, aliases: ['lev', 'lv'] },
  { name: 'Numbers', chapters: 36, aliases: ['num', 'nm', 'nu'] },
  { name: 'Deuteronomy', chapters: 34, aliases: ['deut', 'deu', 'dt'] },
  { name: 'Joshua', chapters: 24, aliases: ['josh', 'jos'] },
  { name: 'Judges', chapters: 21, aliases: ['judg', 'jdg', 'jg'] },
  { name: 'Ruth', chapters: 4, aliases: ['rth', 'ru'] },
  { name: '1 Samuel', chapters: 31, aliases: ['1 sam', '1 sa', '1 sm'] },
  { name: '2 Samuel', chapters: 24, aliases: ['2 sam', '2 sa', '2 sm'] },
  { name: '1 Kings', chapters: 22, aliases: ['1 kgs', '1 ki', '1 kin'] },
  { name: '2 Kings', chapters: 25, aliases: ['2 kgs', '2 ki', '2 kin'] },
  { name: '1 Chronicles', chapters: 29, aliases: ['1 chr', '1 ch', '1 chron'] },
  { name: '2 Chronicles', chapters: 36, aliases: ['2 chr', '2 ch', '2 chron'] },
  { name: 'Ezra', chapters: 10, aliases: ['ezr'] },
  { name: 'Nehemiah', chapters: 13, aliases: ['neh', 'ne'] },
  { name: 'Esther', chapters: 10, aliases: ['est', 'esth'] },
  { name: 'Job', chapters: 42, aliases: ['jb'] },
  { name: 'Psalm', chapters: 150, aliases: ['ps', 'psa', 'psalms', 'pss', 'psm'] },
  { name: 'Proverbs', chapters: 31, aliases: ['prov', 'prv', 'pr'] },
  { name: 'Ecclesiastes', chapters: 12, aliases: ['eccl', 'ecc', 'ec', 'qoh'] },
  { name: 'Song of Solomon', chapters: 8, aliases: ['song', 'song of songs', 'sos', 'ss', 'canticles'] },
  { name: 'Isaiah', chapters: 66, aliases: ['isa', 'is'] },
  { name: 'Jeremiah', chapters: 52, aliases: ['jer', 'jr'] },
  { name: 'Lamentations', chapters: 5, aliases: ['lam', 'la'] },
  { name: 'Ezekiel', chapters: 48, aliases: ['ezek', 'eze', 'ezk'] },
  { name: 'Daniel', chapters: 12, aliases: ['dan', 'dn'] },
  { name: 'Hosea', chapters: 14, aliases: ['hos', 'ho'] },
  { name: 'Joel', chapters: 3, aliases: ['joe', 'jl'] },
  { name: 'Amos', chapters: 9, aliases: ['am'] },
  { name: 'Obadiah', chapters: 1, aliases: ['obad', 'ob'] },
  { name: 'Jonah', chapters: 4, aliases: ['jon', 'jnh'] },
  { name: 'Micah', chapters: 7, aliases: ['mic', 'mi'] },
  { name: 'Nahum', chapters: 3, aliases: ['nah', 'na'] },
  { name: 'Habakkuk', chapters: 3, aliases: ['hab', 'hb'] },
  { name: 'Zephaniah', chapters: 3, aliases: ['zeph', 'zep'] },
  { name: 'Haggai', chapters: 2, aliases: ['hag', 'hg'] },
  { name: 'Zechariah', chapters: 14, aliases: ['zech', 'zec'] },
  { name: 'Malachi', chapters: 4, aliases: ['mal'] },
  { name: 'Matthew', chapters: 28, aliases: ['matt', 'mat', 'mt'] },
  { name: 'Mark', chapters: 16, aliases: ['mrk', 'mk'] },
  { name: 'Luke', chapters: 24, aliases: ['luk', 'lk'] },
  { name: 'John', chapters: 21, aliases: ['jhn', 'jn'] },
  { name: 'Acts', chapters: 28, aliases: ['act', 'ac'] },
  { name: 'Romans', chapters: 16, aliases: ['rom', 'rm'] },
  { name: '1 Corinthians', chapters: 16, aliases: ['1 cor', '1 co'] },
  { name: '2 Corinthians', chapters: 13, aliases: ['2 cor', '2 co'] },
  { name: 'Galatians', chapters: 6, aliases: ['gal', 'ga'] },
  { name: 'Ephesians', chapters: 6, aliases: ['eph'] },
  { name: 'Philippians', chapters: 4, aliases: ['phil', 'php', 'pp'] },
  { name: 'Colossians', chapters: 4, aliases: ['col'] },
  { name: '1 Thessalonians', chapters: 5, aliases: ['1 thess', '1 th', '1 thes'] },
  { name: '2 Thessalonians', chapters: 3, aliases: ['2 thess', '2 th', '2 thes'] },
  { name: '1 Timothy', chapters: 6, aliases: ['1 tim', '1 ti'] },
  { name: '2 Timothy', chapters: 4, aliases: ['2 tim', '2 ti'] },
  { name: 'Titus', chapters: 3, aliases: ['tit'] },
  { name: 'Philemon', chapters: 1, aliases: ['phlm', 'phm', 'philem'] },
  { name: 'Hebrews', chapters: 13, aliases: ['heb'] },
  { name: 'James', chapters: 5, aliases: ['jas', 'jm'] },
  { name: '1 Peter', chapters: 5, aliases: ['1 pet', '1 pe', '1 pt'] },
  { name: '2 Peter', chapters: 3, aliases: ['2 pet', '2 pe', '2 pt'] },
  { name: '1 John', chapters: 5, aliases: ['1 jn', '1 jhn'] },
  { name: '2 John', chapters: 1, aliases: ['2 jn', '2 jhn'] },
  { name: '3 John', chapters: 1, aliases: ['3 jn', '3 jhn'] },
  { name: 'Jude', chapters: 1, aliases: ['jud', 'jd'] },
  { name: 'Revelation', chapters: 22, aliases: ['rev', 'rv', 'revelations', 'apocalypse'] },
];

/**
 * Fold the spellings of the same thing together: "1st Cor.", "1Cor", "1 cor"
 * all come out as "1 cor".
 */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.'’]/g, '')
    .replace(/\b([123])(st|nd|rd)\b/g, '$1')
    .replace(/^([123])(?=[a-z])/, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split what has been typed into the book part and the reference after it, so
 * picking a suggestion can replace the book and leave "3:16" alone.
 */
export function splitReference(value: string): { book: string; rest: string } {
  const match = /^(\s*[123]?\s*[A-Za-z][A-Za-z\s.'’]*)(.*)$/.exec(value);
  return match ? { book: match[1].trim(), rest: match[2].trim() } : { book: '', rest: '' };
}

/**
 * Books worth offering for a part-typed name, best match first.
 *
 * Nothing is offered once a name is complete — a finished "Psalm" should not
 * keep a list hanging under the field while the chapter is typed.
 */
export function suggestBooks(fragment: string, limit = 6): string[] {
  const query = normalize(fragment);
  if (!query) return [];

  // Four tiers, each in Genesis-to-Revelation order. An abbreviation someone
  // actually writes wins outright: "jn" is John, even though Jonah's "jnh"
  // starts with it too.
  const exactAlias: string[] = [];
  const byName: string[] = [];
  const byAlias: string[] = [];
  const byLastWord: string[] = [];

  for (const { name, aliases } of BOOKS) {
    const full = normalize(name);
    if (full === query) return [];
    const short = aliases.map(normalize);

    if (short.includes(query)) exactAlias.push(name);
    else if (full.startsWith(query)) byName.push(name);
    else if (short.some((alias) => alias.startsWith(query))) byAlias.push(name);
    // "corinthians" should still find the two letters that start with a number.
    else if (full.replace(/^[123] /, '').startsWith(query)) byLastWord.push(name);
  }

  return [...exactAlias, ...byName, ...byAlias, ...byLastWord].slice(0, limit);
}

/** A reference the app understood well enough to link to. */
export type Reference = {
  /** The canonical book name, however it was abbreviated when typed. */
  book: string;
  chapters: number;
  /** The first number written, when it is a chapter rather than a verse. */
  chapter: number | null;
  /** What a Bible site should be asked for, e.g. "1 Corinthians 13:4-7". */
  query: string;
};

/** Read "1cor 13:4-7" as 1 Corinthians 13:4-7. Null when no book is recognised. */
export function parseReference(value: string): Reference | null {
  const { book, rest } = splitReference(value);
  if (!book) return null;

  const typed = normalize(book);
  const match = BOOKS.find(
    ({ name, aliases }) => normalize(name) === typed || aliases.some((a) => normalize(a) === typed),
  );
  if (!match) return null;

  // In a one-chapter book people write the verse straight after the name —
  // "Jude 25" is verse 25, not chapter 25 — so that number is not a chapter
  // unless a colon says it is.
  const first = /^(\d+)/.exec(rest)?.[1];
  const numbered = match.chapters > 1 || /^\d+\s*:/.test(rest);

  return {
    book: match.name,
    chapters: match.chapters,
    chapter: first && numbered ? Number(first) : null,
    query: rest ? `${match.name} ${rest}` : match.name,
  };
}

/**
 * What's wrong with a reference, in words, or null when nothing is.
 *
 * Only chapter numbers are checked. Verse numbering differs between
 * translations — 3 John ends at 14 in some and 15 in others — so a verse that
 * looks out of range here may be perfectly real in the Bible on someone's lap.
 */
export function referenceProblem(reference: Reference): string | null {
  const { book, chapter, chapters } = reference;
  if (chapter === null) return null;
  if (chapter < 1) return 'Chapters start at 1';
  if (chapter > chapters) {
    return chapters === 1
      ? `${book} has only one chapter`
      : `${book} has only ${chapters} chapters`;
  }
  return null;
}

/** Where to send someone to read it. No verse text ever enters this app. */
export function passageUrl(reference: Reference): string {
  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(reference.query)}`;
}
