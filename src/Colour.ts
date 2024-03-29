// Copyright 2022 Matthew Mitchell

export default class Colour {
    id: number;
    name: string;
    rgb: number;

    static get palette() {
        // Return new list each time to avoid mutation.
        return [
            new Colour(0, 0xFFFFFF, "white"),
            new Colour(1, 0xC8C8C8, "light grey"),
            new Colour(2, 0x888888, "grey"),
            new Colour(3, 0x000000, "black"),
            new Colour(4, 0xFFA7D1, "pink"),
            new Colour(5, 0xE50000, "red"),
            new Colour(6, 0xF07010, "orange"),
            new Colour(7, 0x663311, "brown"),
            new Colour(8, 0xFFFF00, "yellow"),
            new Colour(9, 0x02D501, "bright green"),
            new Colour(10, 0x3cb054, "peercoin green"),
            new Colour(11, 0x006000, "dark green"),
            new Colour(12, 0x00D3DD, "cyan"),
            new Colour(13, 0x0083C7, "blue"),
            new Colour(14, 0x0000EA, "dark blue"),
            new Colour(15, 0x820080, "purple")
        ];
    }

    constructor(id: number, rgb: number, name: string) {
        this.id = id;
        this.name = name;
        this.rgb = rgb;
    }

    static fromId(id: number): Colour {
        return this.palette[id];
    }

    get cssStr(): string {
        return `#${this.rgb.toString(16).padStart(6, "0")}`;
    }

    get red(): number {
        return this.rgb >> 16;
    }

    get green(): number {
        return (this.rgb >> 8) & 0xff;
    }

    get blue(): number {
        return this.rgb & 0xff;
    }

}

