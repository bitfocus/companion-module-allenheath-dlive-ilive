/**
 * A collection of easing methods defining ease-in ease-out curves from https://github.com/photonstorm/phaser licensed
 * under MIT
 *
 * @class Easing
 */

function getEasing(algorithm, curve) {
    if (algorithm == 'linear' || algorithm == null || curve == null) {
        return Linear.None;
    }
    if (algorithm == 'quadratic' && curve == 'ease-in') return Quadratic.In;
    if (algorithm == 'quadratic' && curve == 'ease-out') return Quadratic.Out;
    if (algorithm == 'quadratic' && curve == 'ease-in-out') return Quadratic.InOut;
    if (algorithm == 'cubic' && curve == 'ease-in') return Cubic.In;
    if (algorithm == 'cubic' && curve == 'ease-out') return Cubic.Out;
    if (algorithm == 'cubic' && curve == 'ease-in-out') return Cubic.InOut;
    if (algorithm == 'quartic' && curve == 'ease-in') return Quartic.In;
    if (algorithm == 'quartic' && curve == 'ease-out') return Quartic.Out;
    if (algorithm == 'quartic' && curve == 'ease-in-out') return Quartic.InOut;
    if (algorithm == 'quintic' && curve == 'ease-in') return Quintic.In;
    if (algorithm == 'quintic' && curve == 'ease-out') return Quintic.Out;
    if (algorithm == 'quintic' && curve == 'ease-in-out') return Quintic.InOut;
    if (algorithm == 'sinusoidal' && curve == 'ease-in') return Sinusoidal.In;
    if (algorithm == 'sinusoidal' && curve == 'ease-out') return Sinusoidal.Out;
    if (algorithm == 'sinusoidal' && curve == 'ease-in-out') return Sinusoidal.InOut;
    if (algorithm == 'exponential' && curve == 'ease-in') return Exponential.In;
    if (algorithm == 'exponential' && curve == 'ease-out') return Exponential.Out;
    if (algorithm == 'exponential' && curve == 'ease-in-out') return Exponential.InOut;
    if (algorithm == 'circular' && curve == 'ease-in') return Circular.In;
    if (algorithm == 'circular' && curve == 'ease-out') return Circular.Out;
    if (algorithm == 'circular' && curve == 'ease-in-out') return Circular.InOut;
    if (algorithm == 'elastic' && curve == 'ease-in') return Elastic.In;
    if (algorithm == 'elastic' && curve == 'ease-out') return Elastic.Out;
    if (algorithm == 'elastic' && curve == 'ease-in-out') return Elastic.InOut;
    if (algorithm == 'back' && curve == 'ease-in') return Back.In;
    if (algorithm == 'back' && curve == 'ease-out') return Back.Out;
    if (algorithm == 'back' && curve == 'ease-in-out') return Back.InOut;
    if (algorithm == 'bounce' && curve == 'ease-in') return Bounce.In;
    if (algorithm == 'bounce' && curve == 'ease-out') return Bounce.Out;
    if (algorithm == 'bounce' && curve == 'ease-in-out') return Bounce.InOut;
    return Linear.None;
}

class Linear {
    static None(k) {
        return k;
    }
}

class Quadratic {
    static In(k) {
        return k * k;
    }
    static Out(k) {
        return k * (2 - k);
    }
    static InOut(k) {
        k *= 2;
        if (k < 1) return 0.5 * k * k;
        return -0.5 * (--k * (k - 2) - 1);
    }
}

class Cubic {
    static In(k) {
        return k * k * k;
    }
    static Out(k) {
        return --k * k * k + 1;
    }
    static InOut(k) {
        k *= 2;
        if (k < 1) return 0.5 * k * k * k;
        return 0.5 * ((k -= 2) * k * k + 2);
    }
}

class Quartic {
    static In(k) {
        return k * k * k * k;
    }
    static Out(k) {
        return 1 - --k * k * k * k;
    }
    static InOut(k) {
        k *= 2;
        if (k < 1) return 0.5 * k * k * k * k;
        return -0.5 * ((k -= 2) * k * k * k - 2);
    }
}

class Quintic {
    static In(k) {
        return k * k * k * k * k;
    }
    static Out(k) {
        return --k * k * k * k * k + 1;
    }
    static InOut(k) {
        k *= 2;
        if (k < 1) return 0.5 * k * k * k * k * k;
        return 0.5 * ((k -= 2) * k * k * k * k + 2);
    }
}

class Sinusoidal {
    static In(k) {
        return 1 - Math.cos((k * Math.PI) / 2);
    }
    static Out(k) {
        return Math.sin((k * Math.PI) / 2);
    }
    static InOut(k) {
        return 0.5 * (1 - Math.cos(Math.PI * k));
    }
}

class Exponential {
    static In(k) {
        return k === 0 ? 0 : Math.pow(1024, k - 1);
    }
    static Out(k) {
        return k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
    }
    static InOut(k) {
        if (k === 0) return 0;
        if (k === 1) return 1;
        k *= 2;
        if (k < 1) return 0.5 * Math.pow(1024, k - 1);
        return 0.5 * (-Math.pow(2, -10 * (k - 1)) + 2);
    }
}

class Circular {
    static In(k) {
        return 1 - Math.sqrt(1 - k * k);
    }
    static Out(k) {
        return Math.sqrt(1 - --k * k);
    }
    static InOut(k) {
        k *= 2;
        if (k < 1) return -0.5 * (Math.sqrt(1 - k * k) - 1);
        return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);
    }
}

class Elastic {
    static In(k) {
        let s;
        let a = 0.1;
        const p = 0.4;
        if (k === 0) return 0;
        if (k === 1) return 1;
        if (!a || a < 1) {
            a = 1;
            s = p / 4;
        } else s = (p * Math.asin(1 / a)) / (2 * Math.PI);
        return -(a * Math.pow(2, 10 * (k -= 1)) * Math.sin(((k - s) * (2 * Math.PI)) / p));
    }
    static Out(k) {
        let s;
        let a = 0.1;
        const p = 0.4;
        if (k === 0) return 0;
        if (k === 1) return 1;
        if (!a || a < 1) {
            a = 1;
            s = p / 4;
        } else s = (p * Math.asin(1 / a)) / (2 * Math.PI);
        return a * Math.pow(2, -10 * k) * Math.sin(((k - s) * (2 * Math.PI)) / p) + 1;
    }
    static InOut(k) {
        let s;
        let a = 0.1;
        const p = 0.4;
        if (k === 0) return 0;
        if (k === 1) return 1;
        if (!a || a < 1) {
            a = 1;
            s = p / 4;
        } else s = (p * Math.asin(1 / a)) / (2 * Math.PI);
        k *= 2;
        if (k < 1) return -0.5 * (a * Math.pow(2, 10 * (k -= 1)) * Math.sin(((k - s) * (2 * Math.PI)) / p));
        return a * Math.pow(2, -10 * (k -= 1)) * Math.sin(((k - s) * (2 * Math.PI)) / p) * 0.5 + 1;
    }
}

class Back {
    static In(k) {
        const s = 1.70158;
        return k * k * ((s + 1) * k - s);
    }
    static Out(k) {
        const s = 1.70158;
        return --k * k * ((s + 1) * k + s) + 1;
    }
    static InOut(k) {
        const s = 1.70158 * 1.525;
        k *= 2;
        if (k < 1) return 0.5 * (k * k * ((s + 1) * k - s));
        return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);
    }
}

class Bounce {
    static In(k) {
        return 1 - Bounce.Out(1 - k);
    }
    static Out(k) {
        if (k < 1 / 2.75) {
            return 7.5625 * k * k;
        } else if (k < 2 / 2.75) {
            return 7.5625 * (k -= 1.5 / 2.75) * k + 0.75;
        } else if (k < 2.5 / 2.75) {
            return 7.5625 * (k -= 2.25 / 2.75) * k + 0.9375;
        } else {
            return 7.5625 * (k -= 2.625 / 2.75) * k + 0.984375;
        }
    }
    static InOut(k) {
        if (k < 0.5) return Bounce.In(k * 2) * 0.5;
        return Bounce.Out(k * 2 - 1) * 0.5 + 0.5;
    }
}

module.exports = {
    getEasing,
    Linear,
    Quadratic,
    Cubic,
    Quartic,
    Quintic,
    Sinusoidal,
    Exponential,
    Circular,
    Elastic,
    Back,
    Bounce,
};
