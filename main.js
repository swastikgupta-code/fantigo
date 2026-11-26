let canvas,context,adapter,device,pipeline,UniformBuffer,bindGroup;
let data = new Float32Array(8);
let last_time = 0.0;
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
class Vec
{
    constructor(x,y)
    {
        this.x = x;
        this.y = y;
        this.length = Math.sqrt(x**2+y**2);
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
}
init();