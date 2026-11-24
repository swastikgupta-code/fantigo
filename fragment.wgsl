struct VertexOutput
{
    @builtin(position) pos: vec4f,
    @location(0) ndc: vec2f
}
struct Uniforms
{
    time: f32,
    resolution: vec2f
}
@group(0) @binding(0) var<uniform> u: Uniforms;
@fragment
fn frag_main(input: VertexOutput) -> @location(0) vec4f
{
    var input_uv = input.ndc;//*u.resolution;
    var col = background(input_uv);
    var rect_col = vec4f(0.7,0.2,0.3,1.0);
    var flower_col = vec4f(0.3,0.3,0.5,1.0);
    var polygon_col = vec4f(0.3,0.3,0.5,1.0);
    col =  mix(col,rect_col,rectangle(0.8,0.2,0.4,0.1,input_uv));
    col = mix(col,flower_col,flower(vec2f(-0.1,0.2),1.57,5,0.3,input_uv));
    col = mix(col,polygon_col,polygon(vec2f(-0.7,-0.4),1.57,5,0.3,input_uv));
    return col;
}
fn background(uv: vec2f) -> vec4f
{
    var b_uv = vec2f(uv.x*0.4,uv.y);
    var black = vec4f(0.0,0.0,0.0,1.0);
    var grape = vec4f(0.349, 0.231, 0.416,1.0);
    var purple = vec4f(0.2745, 0.1569, 0.4039,1.0);
    var galatic = vec4f(0.2275, 0.1216, 0.5412,1.0);
    var t = length(b_uv-vec2f(0.0,-0.5));
    var col = mix(galatic,grape,smoothstep(0.0,0.9,t));
    col = mix(col,black,smoothstep(0.9,2.0,t));
    return col;
}
fn rectangle(x:f32,y:f32,width:f32,height:f32,uv:vec2f) -> f32
{
    if(abs(uv.x-x)<width && abs(uv.y-y)<height)
    {
        return 1.0;
    }
    return 0.0;
}
fn flower(pos:vec2f,rot_angle: f32,n: f32,amp: f32,uv: vec2f) -> f32
{
    var f_uv = rotate(rot_angle,uv-pos);
    var r = length(f_uv);
    var a = atan2(f_uv.x,f_uv.y);
    var f = amp*cos(n*a);
    return 1.0-smoothstep(f-0.005,f+0.005,r);
}
fn polygon(pos: vec2f,rot_angle:f32,n: f32,amp: f32,uv: vec2f) -> f32
{
    var p_uv = rotate(rot_angle,uv-pos);
    var r = length(p_uv);
    var a = atan2(p_uv.x,p_uv.y);
    var angle = 6.28318530718/n;
    var d = cos(floor(0.5+a/angle)*angle-a)*r-amp;
    return 1.0-smoothstep(-0.01,0.01,d);
}
fn rotate(a: f32,uv: vec2f) -> vec2f
{
    var rot: mat2x2f = mat2x2(cos(a),sin(a),-sin(a),cos(a));
    return rot*uv;
}