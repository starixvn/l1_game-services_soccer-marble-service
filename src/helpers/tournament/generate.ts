export default function generate(teams: string[]): { home: string; away: string }[] {
    if (!teams || teams.length < 2 || Math.ceil(Math.log2(teams.length)) !== Math.floor(Math.log2(teams.length))) {
        throw new Error("Invalid parameter");
    }

    const result = [];

    for (let index = 0; index < teams.length; index += 2) {
        result.push({ home: teams[index], away: teams[index + 1] });
    }

    for (let index = teams.length / 2; index < teams.length - 1; index++) {
        result.push({ home: "", away: "" });
    }

    return result;
}
