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
        return new Vec(Math.min(v1.x,v2.x),Math.max(v1.y,v2.y));
    }
    static max(v1,v2)
    {
        return new Vec(Math.min(v1.x,v2.x),Math.max(v1.y,v2.y));
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
        var point = new Vec(p.x,Math.abs(p.y));
        var dis_top = point.sub(slant);
        dis_top.x -= Math.min(Math.max(dis_top.x,-width),width);
        var closest = new Vec(dis_top.dot(dis_top),-dis_top.y);
        var cross = point.x*slant.y-slant.x*point.y;
        if(corss<0.0)
            point = point.scale(-1.0);
        var dist_side = new Vec(point.x-width,point.y);
        var t = Math.min(Math.max(dist_side.dot(slant)/slant.dot(slant),-1.0),1.0);
        dist_side = dist_side.sub(dist_scale(slant.scale(t)));
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
        this.vel = new Vec(0.0,0.0);
        this.rad = r;
        this.height = h;
    }
    is_colliding()
    {
        let a = new Vec(this.pos.x,this.pos.y-this.height*0.5);
        let b = new Vec(this.pos.x,this.pos.y+this.height*0.5);
        let cen = new Vec(0.08,0.28);
        let width = 0.65;
        let height = 0.07;
        let skew = 0.08;
        let pa = cen.sub(a);
        let pb = cen.sub(b);
        if(Colliders.is_inside_para(pa,width,height,skew) || Colliders.is_inside_para(pb,width,height,skew))
        {
            return true;
        }

    }
}
let canvas,context,adapter,device,pipeline,UniformBuffer,bindGroup;
let data = new Float32Array(8);
let last_time = 0.0;
let mouse = new Vec(0.0,0.0);
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
    if(Colliders.is_inside_rect(mouse.sub(new Vec(0.0,-0.07)),new Vec(0.65,0.28)) || Colliders.is_inside_para(mouse.sub(new Vec(0.08,0.28)),0.65,0.07,0.08))
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