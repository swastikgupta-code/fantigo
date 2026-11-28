class Vec
{
    constructor(x,y)
    {
        this.x = x;
        this.y = y;
    }
    get length()
    {
        return Math.hypot(this.x,this.y)
    }
    add(v)
    {
        return new Vec(this.x+v.x,this.y+v.y);
    }
    sub(v)
    {
        return new Vec(this.x-v.x,this.y-v.y);
    }
    mul(v)
    {
        return new Vec(this.x*v.x,this.y*v.y);
    }
    div(v)
    {
        return new Vec(this.x/v.x,this.y/v.y);
    }
    dot(v)
    {
        return (this.x*v.x+this.y*v.y);
    }
    cross(v)
    {
        return this.x*v.y-this.y*v.x;
    }
    abs()
    {
        return new Vec(Math.abs(this.x),Math.abs(this.y));
    }
    scale(s)
    {
        return new Vec(this.x*s,this.y*s);
    }
    static min(v1,v2)
    {
        return new Vec(Math.min(v1.x,v2.x),Math.min(v1.y,v2.y));
    }
    static max(v1,v2)
    {
        return new Vec(Math.max(v1.x,v2.x),Math.max(v1.y,v2.y));
    }
    static mix(v1,v2,t)
    {
        return new Vec(v1.x*(1.0-t)+v2.x*t,v1.y*(1.0-t)+v2.y*t);
    }
}
class Colliders
{
    static is_inside_rect(p,b)
    {
        let d = p.abs().sub(b.abs());
        return (d.x<=0.0 && d.y<=0.0);
    }
    static is_inside_para(p,width,height,skew)
    {
        return (Math.abs(p.y)<=height) && (Math.abs(p.x*height-p.y*skew)<=width*height);
    }
    static is_inside_circle(p,r)
    {
        return p.length<=r;
    }
    static is_inside_capsule(p,a,b,r)
    {
        let line = b.sub(a);
        let point = p.sub(a);
        let t = Math.min(Math.max(point.dot(line)/line.dot(line),0.0),1.0) || 0.0;
        let closest = point.sub(line.scale(t));
        return closest.length<=r;
    }
}
class Sdf
{
    static para(p,width,height,skew)
    {
        var slant = new Vec(skew,height);
        var point = new Vec(p.x,p.y);
        if(point.y<0.0)
            point = point.scale(-1.0);
        var dis_top = point.sub(slant);
        dis_top.x -= Math.min(Math.max(dis_top.x,-width),width);
        var closest = new Vec(dis_top.dot(dis_top),-dis_top.y);
        var cross = point.x*slant.y-slant.x*point.y;
        if(cross<0.0)
            point = point.scale(-1.0);
        var dist_side = new Vec(point.x-width,point.y);
        var t = Math.min(Math.max(dist_side.dot(slant)/slant.dot(slant),-1.0),1.0);
        dist_side = dist_side.sub(slant.scale(t));
        var side = new Vec(dist_side.dot(dist_side),height*width-Math.abs(cross));
        closest = Vec.min(closest,side);
        return Math.sqrt(closest.x)*Math.sign(-closest.y);
    }
}
class Player
{
    constructor(pos,r,h)
    {
        this.pos = pos;
        this.vel = new Vec(1.0,0.0);
        this.rad = r;
        this.height = h;
    }
    is_colliding_para(cen,width,height,skew)
    {
        let a = new Vec(this.pos.x,this.pos.y-this.height*0.5);
        let b = new Vec(this.pos.x,this.pos.y+this.height*0.5);
        let pa = cen.sub(a);
        let pb = cen.sub(b);
        if(Colliders.is_inside_para(pa,width,height,skew) || Colliders.is_inside_para(pb,width,height,skew))
        {
            return true;
        }
        let t0 = 0.0;
        let t1 = 1.0;
        let inv_phi = 0.61803398875;
        let c = t1 - inv_phi*(t1-t0);
        let d = t0 + inv_phi*(t1-t0);
        let sdfc = Sdf.para(Vec.mix(pa,pb,c),width,height,skew);
        let sdfd = Sdf.para(Vec.mix(pa,pb,d),width,height,skew);
        for(var i = 0;i<15;i++)
        {
            if(sdfc<sdfd)
            {
                t1 = d;
                d=c;
                sdfd = sdfc;
                c = t1 - inv_phi*(t1-t0);
                sdfc = Sdf.para(Vec.mix(pa,pb,c),width,height,skew);
            }
            else
            {
                t0 = c;
                c=d;
                sdfc = sdfd;
                d = t0 + inv_phi*(t1-t0);
                sdfd = Sdf.para(Vec.mix(pa,pb,d),width,height,skew);
            }
        }
        return Math.min(sdfc,sdfd) < this.rad;
    }
    is_colliding_rect(cen,width,height)
    {
        return this.is_colliding_para(cen,width,height,0.0);
    }
    move(delta_time)
    {
        this.pos = this.pos.add(this.vel.scale(delta_time));
    }
}
let canvas,context,adapter,device,pipeline,UniformBuffer,bindGroup;
let data = new Float32Array(16);
let last_time = 0.0;
let mouse = new Vec(0.0,0.0);
let player = new Player(new Vec(-1.0,0.0),0.2,0.6);
async function init()
{
    canvas = document.getElementById("gpucanvas");
    context = canvas.getContext("webgpu");
    adapter = await navigator.gpu.requestAdapter();
    device = await adapter.requestDevice();
    context.configure({
        device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        alphaMode: "opaque"
    });
    let [vert_shader, frag_shader] = await Promise.all([
        fetch("./vertex.wgsl").then((res) => res.text()),
        fetch("./fragment.wgsl").then((res) => res.text()),
    ]);
    vert_shader = device.createShaderModule({code: vert_shader});
    frag_shader = device.createShaderModule({code: frag_shader});
    pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
            module: vert_shader,
            entryPoint: "vert_main"
        },
        fragment: {
            module: frag_shader,
            entryPoint: "frag_main",
            targets: [{format: navigator.gpu.getPreferredCanvasFormat()}]
        },
        primitive: {
            topology: "triangle-list"
        }
    });
    UniformBuffer = device.createBuffer({
        size: data.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {buffer: UniformBuffer}
            }
        ]
    });
    requestAnimationFrame(render);
}
function render(time)
{
    time = time * 0.001;
    if(last_time==0.0) last_time = time;
    let delta_time = time - last_time;
    data[0] = canvas.width/canvas.height;
    data[1] = 1.0;
    data[2] = time;
    data[3] = delta_time;
    data[4] = mouse.x;
    data[5] = mouse.y;
    data[6] = player.pos.x;
    data[7] = player.pos.y;
    player.move(delta_time);
    if(player.is_colliding_rect(new Vec(0.0,-0.07),0.65,0.28) || player.is_colliding_para(new Vec(0.08,0.28),0.65,0.07,0.08))
    {
        document.title = "inside the rectangle";
    }
    else
    {
        document.title = "outside the rectangle";
    }
    device.queue.writeBuffer(UniformBuffer,0,data);
    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();
    const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [
            {
                view: textureView,
                clearValue: {r: 0,g: 0,b: 0.4,a: 1.0},
                loadOp : "clear",
                storeOp: "store"
            }
        ]
    });
    renderPass.setPipeline(pipeline);
    renderPass.setBindGroup(0,bindGroup);
    renderPass.draw(6);
    renderPass.end();
    device.queue.submit([commandEncoder.finish()]);
    last_time=time;
    requestAnimationFrame(render);
}
document.addEventListener("mousemove",(event)=>{
    const aspect = window.innerWidth/window.innerHeight;
    mouse.x = (event.clientX/window.innerWidth*2.0-1.0)*aspect;
    mouse.y = event.clientY/window.innerHeight*2.0-1.0;
});
init();