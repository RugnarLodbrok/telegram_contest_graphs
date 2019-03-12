function* zip(...args) {
    const iterators = args.map(x => x[Symbol.iterator]());
    while (true) {
        const current = iterators.map(x => x.next());
        if (current.some(x => x.done)) {
            break;
        }
        yield current.map(x => x.value);
    }
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

function log(...args) {
    console.log(args.join(' '))
}

class CrossDrawer {

    constructor(ctx, w, h) {
        this.ctx = ctx;
        log(ctx);
        this.x = 0;
        this.y = 0;
        this.w = w;
        this.h = h;
        this.dash_style = [5, 10]
    }

    mouse_move(x, y) {
        let old_x = this.x;
        let old_y = this.y;
        let ctx = this.ctx;

        ctx.clearRect(0, 0, this.w, this.h);
        /*
        if (old_x !== x) {
            ctx.clearRect(old_x, 0, 1, this.h);
            this.x = x;
        }

        if (old_y !== y) {
            ctx.clearRect(0, old_y, this.w, 1);
            this.y = y;
        }*/
        ctx.setLineDash(this.dash_style);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, this.h);
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(this.w, y + 0.5);

        ctx.stroke();
    }
}

class Range {
    constructor(x_min, x_max) {
        this.x_min = x_min;
        this.x_max = x_max;
    }
}

class Domain extends Range {
    add(other) {
        this.x_min = Math.min(this.x_min, other.x_min);
        this.x_max = Math.max(this.x_max, other.x_max);
    }

    get_transform(other) {
        let a = (other.x_max - other.x_min) / (this.x_max - this.x_min);
        let b = other.x_min - this.x_min * a;
        return function transform(x) {
            return a * x + b;
        }
    }
}

class Graph {
    constructor(data) {
        let columns = data.columns;
        this.xx = columns[0].slice(1);
        this.yy = {};
        for (let i = 1; i < columns.length; ++i) {
            let name = columns[i][0];
            let yy = columns[i].slice(1);
            let type = data.types[name];
            let color = data.colors[name];
            this.yy[name] = {yy: yy, type: type, color: color}
        }
    }

    draw(range_x, range_y, domain_x, domain_y) {
        //return: svg paths
        let transform_x = domain_x.get_transform(range_x);
        let transform_y = domain_y.get_transform(range_y);
        let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        for (const [name, props] of Object.entries(this.yy)) {
            let d = "M 0 0 ";
            for (const [x, y] of zip(this.xx, props.yy)) {
                d += `L ${Math.trunc(transform_x(x))} ${Math.trunc(transform_y(y))} `
            }
            console.log("path: ", d);
            let p = document.createElementNS("http://www.w3.org/2000/svg", "path");
            p.setAttribute("d", d);
            p.setAttribute("stroke-linecap", "round");
            p.setAttribute("style", `stroke:${props.color}; stroke-width:5; fill: none`);
            // console.log(name, props);
            g.appendChild(p);
        }
        return g;
    }

    get_domains() {
        console.log("constructing domain:", Math.min.apply(null, this.xx));
        let min_y = Math.min.apply(null, Object.values(this.yy).map((g) => Math.min.apply(null, g.yy)));
        let max_y = Math.max.apply(null, Object.values(this.yy).map((g) => Math.max.apply(null, g.yy)));
        return [
            new Domain(Math.min.apply(null, this.xx), Math.max.apply(null, this.xx)),
            new Domain(min_y, max_y)];
    };
}

class Plot {
    constructor(svg) {
        // this.canvas = canvas;
        // this.ctx = canvas.getContext('2d');
        // let cd = new CrossDrawer(this.ctx, canvas.width, canvas.height);
        let w = svg.getAttribute("width");
        let h = svg.getAttribute("height");
        this.range_x = new Range(0, w);
        this.range_y = new Range(h, 0);
        this.domain_x = new Domain(0, 100);
        this.domain_y = new Domain(0, 100);

        // let ox = canvas.getBoundingClientRect().left + 1;
        // let oy = canvas.getBoundingClientRect().top + 1;
        // canvas.onmousemove = function (e) {
        //     cd.mouse_move(e.x - ox, e.y - oy);
        // };

        this.graps = chart_data.slice(0, 1).map((data) => new Graph(data));
    }

    draw() {
        if (this.graps.length === 0) {
            return
        }
        let self = this;
        // for (let [k, v] of this.yy){}

        [self.domain_x, self.domain_y] = self.graps[0].get_domains();
        this.graps.forEach(function (graph) { //slice [1:]
            let dx, dy;
            [dx, dy] = graph.get_domains();
            self.domain_x.add(dx);
            self.domain_y.add(dy);
        });

        let svg_paths = this.graps.map((graph) => graph.draw(self.range_x, self.range_y,
            self.domain_x, self.domain_y));
        console.log(svg_paths);
        return svg_paths;
    }
}

let W = 500;
let H = 400;

function draw() {
    console.log('draw!');
    /*
    let canvas = document.getElementById('canvas');
    canvas.width = W;
    canvas.height = H;*/
    let svg = document.getElementById('svg');
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    let gs = new Plot(svg).draw();
    console.log(gs);
    svg.appendChild(gs[0]);

    /*    function frame() {
            console.log('frame!');
            ctx.fillStyle = 'rgb(200, 0, 0)';
            ctx.fillRect(x, 10, 50, 50);
            ctx.clearRect(10, 20, 20, 20);
            x += 1;
    //        requestAnimationFrame(frame);
        }

        if (canvas.getContext) {
            // frame();
        }
        */
}

console.log(draw);
document.getElementById('body').onload = draw;
