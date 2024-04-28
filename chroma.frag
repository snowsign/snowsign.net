#version 300 es
precision highp float;

const float circleRadius = 0.185;

const float PI = 3.1415926538;

uniform vec2 iResolution;
uniform vec2 iMouse;
uniform float iFalloff;
out vec4 fragColor;

// === Credit to yiwenl and Experience-Monks on GitHub for color conversion algorithms ===
#define saturate(v) clamp(v,0.0,1.0)

vec3 hue2rgb(float hue){
    hue=fract(hue);
    return saturate(vec3(
        abs(hue*6.0-3.0)-1.0,
        2.0-abs(hue*6.0-2.0),
        2.0-abs(hue*6.0-4.0)
    ));
}

vec3 rgb2hsl(vec3 c){
    float cMin=min(min(c.r,c.g),c.b),
          cMax=max(max(c.r,c.g),c.b),
          delta=cMax-cMin;
    vec3 hsl=vec3(0.0,0.0,(cMax+cMin)/2.0);
    if(delta!=0.0){
        if(hsl.z<.5){
            hsl.y=delta/(cMax+cMin);
        }else{
            hsl.y=delta/(2.0-cMax-cMin);
        }
        float deltaR=(((cMax-c.r)/6.0)+(delta/2.0))/delta,
              deltaG=(((cMax-c.g)/6.0)+(delta/2.0))/delta,
              deltaB=(((cMax-c.b)/6.0)+(delta/2.0))/delta;
        if(c.r==cMax){
            hsl.x=deltaB-deltaG;
        }else if(c.g==cMax){
            hsl.x=(1.0/3.0)+deltaR-deltaB;
        }else{
            hsl.x=(2.0/3.0)+deltaG-deltaR;
        }
        hsl.x=fract(hsl.x);
    }
    return hsl;
}

vec3 hsl2rgb(vec3 hsl){
    if(hsl.y==0.0){
        return vec3(hsl.z);
    }else{
        float b;
        if(hsl.z<0.5){
            b=hsl.z*(1.0+hsl.y);
        }else{
            b=hsl.z+hsl.y-hsl.y*hsl.z;
        }
        float a=2.0*hsl.z-b;
        return a+hue2rgb(hsl.x)*(b-a);
    }
}
// === End credit ===

vec2 convertAngle(vec2 mid, float theta, float radius) {
    return vec2(sin(theta) * radius + mid.x, cos(theta) * radius + mid.y);
}

float strength(float d) {
    return min(exp(-20.0 * (d - circleRadius) / iFalloff), 1.0);
}


void main() {
    vec2 uv = gl_FragCoord.xy/iResolution.yy;
    vec2 mv = iMouse.xy/iResolution.yy;
    vec2 mid = iResolution.xy/iResolution.yy/2.0;

    
    float theta = atan(mv.x - mid.x, mv.y - mid.y);
    float radius = distance(mv, mid);
    
    vec2 c1 = convertAngle(mid, theta, radius);
    vec2 c2 = convertAngle(mid, theta + 2.0 * PI / 3.0, radius);
    vec2 c3 = convertAngle(mid, theta + 4.0 * PI / 3.0, radius);
    
    float s1 = strength(distance(uv, c1));
    float s2 = strength(distance(uv, c2));
    float s3 = strength(distance(uv, c3));
    

    vec3 hsl = rgb2hsl(vec3(s1,s2,s3));
    float a = hsl.z > 0.5 ? (1.0 - hsl.z) * 2.0 : 1.0;
    hsl.z = hsl.z >= 0.5 ? 0.5 : hsl.z;
    vec3 col = hsl2rgb(vec3(hsl.x, hsl.y, hsl.z));
    
    if (isnan(mv.x) || isnan(mv.y)) {
        col = vec3(0,0,0);
        a = 1.0;
    }
    if (a < 0.0 || a > 1.0) {
        col = vec3(0.8,0.1,0.8);
        a = 1.0;
    }

    fragColor = vec4(col,a);
}