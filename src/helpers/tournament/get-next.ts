export default function getNext<Match>(matches: Match[], index: number): Match {
    if (
        !matches ||
        matches.length < 2 ||
        matches.length - 1 <= index ||
        Math.ceil(Math.log2(matches.length + 1)) !== Math.floor(Math.log2(matches.length + 1))
    ) {
        throw new Error("Invalid parameter");
    }

    const nextIndex = Math.floor((matches.length + index + 1) / 2);

    return matches[nextIndex];
}
