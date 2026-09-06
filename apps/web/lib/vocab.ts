// Vocab rows keep the noun in `german` and its article in a separate
// `article` column — but a lot of the seed data also bakes the article into
// `german` ("das Kino" alongside article "das"). Rendering the coloured
// article badge next to the raw `german` then prints it twice ("das das Kino").
//
// `splitGermanNoun` normalises whatever it's given into a single
// `{ article, noun }` pair with no repetition:
//
//   ("das", "das Kino")  -> { article: "das", noun: "Kino" }
//   ("das", "Kino")      -> { article: "das", noun: "Kino" }
//   (null,  "das Kino")  -> { article: "das", noun: "Kino" }
//   (null,  "Kino")      -> { article: null,  noun: "Kino" }
//   ("die", "das Kino")  -> { article: "die", noun: "Kino" }  (explicit field wins)

const LEADING_ARTICLE = /^(der|die|das)\s+/i;

export function splitGermanNoun(
  article: string | null | undefined,
  german: string | null | undefined,
): { article: string | null; noun: string } {
  const noun = (german ?? "").trim();
  const explicit = article?.trim().toLowerCase() || null;

  const match = noun.match(LEADING_ARTICLE);
  if (match) {
    return {
      article: explicit ?? match[1].toLowerCase(),
      noun: noun.replace(LEADING_ARTICLE, "").trim(),
    };
  }
  return { article: explicit, noun };
}

/**
 * Drop a leading der/die/das from a string — used for plural forms, which are
 * rendered with a hard-coded "die" prefix and would otherwise double up
 * ("plural: die die Kinos").
 */
export function stripLeadingArticle(text: string | null | undefined): string {
  return splitGermanNoun(null, text).noun;
}
