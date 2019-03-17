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

function split_first(arr) {
    let rest = [...arr];
    let first = rest.shift();
    return [first, rest];
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
        this.mn = x_min;
        this.mx = x_max;
    }

    get_transform(other) {
        // get transform from self coords to other's coords
        let a = (other.mx - other.mn) / (this.mx - this.mn);
        let b = other.mn - this.mn * a;
        return function transform(x) {
            return a * x + b;
        }
    }
}

class Domain extends Range {
    add(other) {
        this.mn = Math.min(this.mn, other.mn);
        this.mx = Math.max(this.mx, other.mx);
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
        //return: arrays of points in RANGE
        let transform_x = domain_x.get_transform(range_x);
        let transform_y = domain_y.get_transform(range_y);
        let points = {};
        for (const [name, props] of Object.entries(this.yy)) {
            let pp = [];
            for (const [x, y] of zip(this.xx, props.yy)) {
                pp.push([Math.trunc(transform_x(x)), Math.trunc(transform_y(y))]);
            }
            points[name] = {pp: pp, color: props.color};
        }
        return points;
    }

    static draw_svg(points) {
        let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        for (const [name, props] of Object.entries(points)) {
            let [first, rest] = split_first(props.pp);
            let d = `M ${first[0]} ${first[1]} `;
            for (const [x, y] of rest) {
                d += `L ${x} ${y} `
            }
            let p = document.createElementNS("http://www.w3.org/2000/svg", "path");
            p.setAttribute("d", d);
            p.setAttribute("stroke-linecap", "round");
            p.setAttribute("style", `stroke:${props.color}; stroke-width:5; fill: none`);
            g.appendChild(p);
        }
        return g;
    }

    static draw_canvas(ctx, points, stroke_width) {
        stroke_width = stroke_width || 5;
        for (const [name, props] of Object.entries(points)) {
            // ctx.setLineDash();
            ctx.strokeStyle = props.color;
            ctx.lineWidth = stroke_width;
            ctx.beginPath();

            let [first, rest] = split_first(props.pp);
            ctx.moveTo(...first);
            for (const [x, y] of rest) {
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }

    get_domains() {
        let min_y = Math.min.apply(null, Object.values(this.yy).map((g) => Math.min.apply(null, g.yy)));
        let max_y = Math.max.apply(null, Object.values(this.yy).map((g) => Math.max.apply(null, g.yy)));
        return [
            new Domain(Math.min.apply(null, this.xx), Math.max.apply(null, this.xx)),
            new Domain(min_y, max_y)];
    };
}

class Plot {
    constructor(canvas, w, h, stroke_width) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.range_x = new Range(0, w);
        this.range_y = new Range(h, 0);
        this.stroke_width = stroke_width || 5;

        this.graps = chart_data.slice(0, 1).map((data) => new Graph(data));

        this.domain_x = new Domain(0, 100);
        this.domain_y = new Domain(0, 100);
        let self = this;
        if (this.graps.length !== 0) {
            [this.domain_x, this.domain_y] = this.graps[0].get_domains();
            this.graps.forEach(function (graph) { //slice [1:]
                let dx, dy;
                [dx, dy] = graph.get_domains();
                self.domain_x.add(dx);
                self.domain_y.add(dy);
            });
        }
    }

    draw_svg() {
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

        let svg_paths = this.graps.map((graph) => Graph.draw_svg(graph.draw(self.range_x, self.range_y,
            self.domain_x, self.domain_y)));
        console.log(svg_paths);
        return svg_paths;
    }

    draw_canvas() {
        let ctx = this.ctx;
        let self = this;
        // if (this.graps.length === 0) {
        //     return
        // }
        // // for (let [k, v] of this.yy){}
        //
        // [self.domain_x, self.domain_y] = self.graps[0].get_domains();
        // this.graps.forEach(function (graph) { //slice [1:]
        //     let dx, dy;
        //     [dx, dy] = graph.get_domains();
        //     self.domain_x.add(dx);
        //     self.domain_y.add(dy);
        // });


        this.graps.map((graph) => Graph.draw_canvas(ctx, graph.draw(self.range_x, self.range_y,
            self.domain_x, self.domain_y), this.stroke_width));
    }
    clear(){
        this.ctx.clearRect(this.range_x.mn, this.range_y.mn,
            this.range_x.mx - this.range_x.mn, this.range_y.mx - this.range_y.mn);

    }
}

class ScrollerPlot extends Plot {
    constructor(canvas, w, h, stroke_width, on_rerange) {
        super(canvas, w, h, stroke_width);
        let self = this;
        this.on_rerange = on_rerange;
        this.canvas.style.background = "#f3f9fb";
        this.canvas.style.border = "none";
        this.frame_color = "#dfebed";
        this.frame_color2 = "#fff";
        this.selected_range = new Range(this.range_x.mn, this.range_x.mx);
        this.frame_w = 6;

        let is_dragging_left = false;
        let is_dragging_right = false;
        canvas.addEventListener('mousedown', function (e) {
            let rect = canvas.getBoundingClientRect();
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;
            if (x > self.selected_range.mn && x < self.selected_range.mn + self.frame_w) {
                is_dragging_left = true;
            } else if (x < self.selected_range.mx && x > self.selected_range.mx - self.frame_w) {
                is_dragging_right = true;
            }
        });
        canvas.addEventListener('mousemove', function (e) {
            let rect = canvas.getBoundingClientRect();
            let x = e.clientX - rect.left;
            if (is_dragging_left) {
                console.log("left", e);
                self.set_selected_range(x);
            }
            if (is_dragging_right) {
                console.log("right", e);
                self.set_selected_range(null, x);
            }
        });
        canvas.addEventListener('mouseup', function (e) {
            is_dragging_left = false;
            is_dragging_right = false;
        });
        canvas.addEventListener('mouseleave', function (e) {
            is_dragging_left = false;
            is_dragging_right = false;
        });
    }

    set_selected_range(mn, mx) {
        if (mn) {
            this.selected_range.mn = mn;
        }
        if (mx) {
            this.selected_range.mx = mx;
        }
        this.draw_canvas(this.ctx);
        let tr = this.range_x.get_transform(this.domain_x);
        if (this.on_rerange) {
            this.on_rerange(new Domain(tr(this.selected_range.mn), tr(this.selected_range.mx)));
        }
    }

    draw_canvas() {
        let ctx = this.ctx;
        this.clear();
        ctx.fillStyle = this.frame_color;
        let [x0, y0, x1, y1] = [this.selected_range.mn, this.range_y.mx, this.selected_range.mx, this.range_y.mn];
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        x0 += this.frame_w;
        x1 -= this.frame_w;
        y0 += 3;
        y1 -= 3;
        ctx.fillStyle = this.frame_color2;
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        console.log("draw frame", this.selected_range.mn, this.range_y.mn, this.selected_range.mx, this.range_y.mx);
        return super.draw_canvas(ctx);
    }
}

let W = 500;
let H = 600;
let sH = 64;

function draw() {

    let canvas = document.getElementById('canvas');
    let sub_canvas = document.getElementById('sub-canvas');
    canvas.width = W;
    canvas.height = H;
    sub_canvas.width = W;
    sub_canvas.height = sH;

    // let svg = document.getElementById('svg');
    // svg.setAttribute("width", W);
    // svg.setAttribute("height", H);
    let main_plot = new Plot(canvas, W, H);
    main_plot.draw_canvas();
    new ScrollerPlot(sub_canvas, W, sH, 2, function (new_domain) {
        console.log("new domain", new_domain);
        main_plot.domain_x = new_domain;
        main_plot.clear();
        main_plot.draw_canvas();
    }).draw_canvas();
    // console.log(gs);
    // svg.appendChild(gs[0]);

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

document.getElementById('body').onload = draw;
