/**
 * Bible book names, and the matching behind the suggestions in the Bible-text
 * field.
 *
 * People type a reference the short way — "ps 23", "1cor 13", "jn 3:16" — so
 * matching runs over a list of the abbreviations they actually write, not just
 * the full names. The names themselves are the 66 books of the Protestant
 * canon, which is what JIL Austria preaches from.
 */

type Book = { name: string; aliases: string[] };

const BOOKS: Book[] = [
  { name: 'Genesis', aliases: ['gen', 'ge', 'gn'] },
  { name: 'Exodus', aliases: ['ex', 'exo', 'exod'] },
  { name: 'Leviticus', aliases: ['lev', 'lv'] },
  { name: 'Numbers', aliases: ['num', 'nm', 'nu'] },
  { name: 'Deuteronomy', aliases: ['deut', 'deu', 'dt'] },
  { name: 'Joshua', aliases: ['josh', 'jos'] },
  { name: 'Judges', aliases: ['judg', 'jdg', 'jg'] },
  { name: 'Ruth', aliases: ['rth', 'ru'] },
  { name: '1 Samuel', aliases: ['1 sam', '1 sa', '1 sm'] },
  { name: '2 Samuel', aliases: ['2 sam', '2 sa', '2 sm'] },
  { name: '1 Kings', aliases: ['1 kgs', '1 ki', '1 kin'] },
  { name: '2 Kings', aliases: ['2 kgs', '2 ki', '2 kin'] },
  { name: '1 Chronicles', aliases: ['1 chr', '1 ch', '1 chron'] },
  { name: '2 Chronicles', aliases: ['2 chr', '2 ch', '2 chron'] },
  { name: 'Ezra', aliases: ['ezr'] },
  { name: 'Nehemiah', aliases: ['neh', 'ne'] },
  { name: 'Esther', aliases: ['est', 'esth'] },
  { name: 'Job', aliases: ['jb'] },
  { name: 'Psalm', aliases: ['ps', 'psa', 'psalms', 'pss', 'psm'] },
  { name: 'Proverbs', aliases: ['prov', 'prv', 'pr'] },
  { name: 'Ecclesiastes', aliases: ['eccl', 'ecc', 'ec', 'qoh'] },
  { name: 'Song of Solomon', aliases: ['song', 'song of songs', 'sos', 'ss', 'canticles'] },
  { name: 'Isaiah', aliases: ['isa', 'is'] },
  { name: 'Jeremiah', aliases: ['jer', 'jr'] },
  { name: 'Lamentations', aliases: ['lam', 'la'] },
  { name: 'Ezekiel', aliases: ['ezek', 'eze', 'ezk'] },
  { name: 'Daniel', aliases: ['dan', 'dn'] },
  { name: 'Hosea', aliases: ['hos', 'ho'] },
  { name: 'Joel', aliases: ['joe', 'jl'] },
  { name: 'Amos', aliases: ['am'] },
  { name: 'Obadiah', aliases: ['obad', 'ob'] },
  { name: 'Jonah', aliases: ['jon', 'jnh'] },
  { name: 'Micah', aliases: ['mic', 'mi'] },
  { name: 'Nahum', aliases: ['nah', 'na'] },
  { name: 'Habakkuk', aliases: ['hab', 'hb'] },
  { name: 'Zephaniah', aliases: ['zeph', 'zep'] },
  { name: 'Haggai', aliases: ['hag', 'hg'] },
  { name: 'Zechariah', aliases: ['zech', 'zec'] },
  { name: 'Malachi', aliases: ['mal'] },
  { name: 'Matthew', aliases: ['matt', 'mat', 'mt'] },
  { name: 'Mark', aliases: ['mrk', 'mk'] },
  { name: 'Luke', aliases: ['luk', 'lk'] },
  { name: 'John', aliases: ['jhn', 'jn'] },
  { name: 'Acts', aliases: ['act', 'ac'] },
  { name: 'Romans', aliases: ['rom', 'rm'] },
  { name: '1 Corinthians', aliases: ['1 cor', '1 co'] },
  { name: '2 Corinthians', aliases: ['2 cor', '2 co'] },
  { name: 'Galatians', aliases: ['gal', 'ga'] },
  { name: 'Ephesians', aliases: ['eph'] },
  { name: 'Philippians', aliases: ['phil', 'php', 'pp'] },
  { name: 'Colossians', aliases: ['col'] },
  { name: '1 Thessalonians', aliases: ['1 thess', '1 th', '1 thes'] },
  { name: '2 Thessalonians', aliases: ['2 thess', '2 th', '2 thes'] },
  { name: '1 Timothy', aliases: ['1 tim', '1 ti'] },
  { name: '2 Timothy', aliases: ['2 tim', '2 ti'] },
  { name: 'Titus', aliases: ['tit'] },
  { name: 'Philemon', aliases: ['phlm', 'phm', 'philem'] },
  { name: 'Hebrews', aliases: ['heb'] },
  { name: 'James', aliases: ['jas', 'jm'] },
  { name: '1 Peter', aliases: ['1 pet', '1 pe', '1 pt'] },
  { name: '2 Peter', aliases: ['2 pet', '2 pe', '2 pt'] },
  { name: '1 John', aliases: ['1 jn', '1 jhn'] },
  { name: '2 John', aliases: ['2 jn', '2 jhn'] },
  { name: '3 John', aliases: ['3 jn', '3 jhn'] },
  { name: 'Jude', aliases: ['jud', 'jd'] },
  { name: 'Revelation', aliases: ['rev', 'rv', 'revelations', 'apocalypse'] },
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
