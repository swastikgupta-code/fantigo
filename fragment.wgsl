struct VertexOutput
{
    @builtin(position) pos: vec4f,
    @location(0) ndc: vec2f
}
@fragment
fn frag_main(input: VertexOutput) -> @location(0) vec4f
{
    var input_uv = input.ndc;
    var col = background(input_uv);
    if(abs(input_uv.x)<0.4 && abs(input_uv.y)<0.2)
    {
        col =  vec4f(0.7,0.2,0.3,1.0);
    }
    return col;
}
fn background(uv: vec2f) -> vec4f
{
    var b_uv = vec2f(uv.x*0.4,uv.y*0.5);
    var black = vec4f(0.0,0.0,0.0,1.0);
    var grape = vec4f(0.349, 0.231, 0.416,1.0);
    var purple = vec4f(0.2745, 0.1569, 0.4039,1.0);
    var galatic = vec4f(0.2275, 0.1216, 0.5412,1.0);
    var t = length(b_uv-vec2f(0.0,-0.5));
    var col = mix(galatic,grape,smoothstep(0.0,0.5,t));
    col = mix(col,purple,smoothstep(0.5,0.9,t));
    col = mix(col,black,smoothstep(0.9,2.0,t));
    return col;
}