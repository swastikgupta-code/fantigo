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
}
class Colliders
{
    is_inside_rect(p,b)
    {
        let d = p.abs().sub(b.abs());
        return (d.x<=0.0 && d.y<=0.0);
    }
    is_inside_para(p,width,height,skew)
    {
        return (Math.abs(p.y)<=height) && (Math.abs(p.x*height-p.y*skew)<=width*height);
    }
    is_inside_circle(p,r)
    {
        return p.length<=r;
    }
    is_inside_capsule(p,a,b,r)
    {
        let line = b.sub(a);
        let point = p.sub(a);
        let t = Math.min(Math.max(point.dot(line)/line.dot(line),0.0),1.0) || 0.0;
        let closest = point.sub(line.scale(t));
        return closest.length<=r;
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
    mouse.x = event.clientX/window.innerWidth*2.0-1.0;
    mouse.y = event.clientY/window.innerHeight*2.0-1.0;
});
init();