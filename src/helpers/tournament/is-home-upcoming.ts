export default function isHomeUpcoming<Match>(matches: Match[], index: number): boolean {
    if (
        !matches ||
        matches.length < 2 ||
        matches.length - 1 <= index ||
        Math.ceil(Math.log2(matches.length + 1)) !== Math.floor(Math.log2(matches.length + 1))
    ) {
        throw new Error("Invalid parameter");
    }

    return (matches.length + index + 1) % 2 === 0;
}
