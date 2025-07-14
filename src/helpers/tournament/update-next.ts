import getNext from "./get-next";
import isHomeUpcoming from "./is-home-upcoming";

interface IBaseMatch<Value> {
    home: Value;
    away: Value;
}

export default function updateNext<Value, Match extends IBaseMatch<Value>>(matches: Match[], index: number, value: Value): void {
    const match = getNext(matches, index);
    const property = isHomeUpcoming(matches, index) ? "home" : "away";

    if (typeof match[property] !== "undefined") {
        match[property] = value;
    }
}
