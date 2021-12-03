// Even though the shaders are coded into the javascript, I have this file so I can get syntax highlighting. Then I just copy+paste to the javascript

struct Material {
    float shininess;
    vec3 Ka;
    vec3 Kd;
    vec3 Ks;
};

struct Light {
    vec3 pos;
    vec3 Ia;
    vec3 Id;
    vec3 Is;
};

uniform mat4 u_ModelMatrix;
uniform mat4 u_ProjectionMatrix;
uniform mat4 u_NormalMatrix;
uniform vec4 u_ColorOverride;
uniform bool u_PopOut;
uniform vec3 u_CameraPos;
uniform bool u_ShowNormals;
uniform Material u_Material;
uniform Light u_Light;
uniform float u_WorldStretch;
uniform float u_WorldStretchPhase;
uniform bool u_BlinnLighting;

attribute vec4 a_Position;
attribute vec3 a_Color;
attribute vec3 a_Normal;

varying vec4 v_Color;

void getColorFromLighting(vec3 v_Pos, vec3 v_Normal) {
    vec3 N = normalize(v_Normal);
    vec3 L = normalize(u_Light.pos - v_Pos);

    float diffuse = max(dot(N, L), 0.0);

    float specAngle;
    vec3 V = normalize(u_CameraPos - v_Pos);
    if (u_BlinnLighting) {
        vec3 H = normalize(L + V);
        specAngle = max(dot(N, H), 0.0);
    } else {
        vec3 R = reflect(-L, N);
        specAngle = max(dot(R, V), 0.0);
    }
    float specular = pow(specAngle, u_Material.shininess);

    vec4 lighting = vec4(u_Material.Ka * u_Light.Ia + u_Material.Kd * diffuse * u_Light.Id + u_Material.Ks * specular * u_Light.Is, 1.0);

    v_Color = v_Color * lighting;
}

void getColorFromNormal(vec3 v_Normal) {
    vec3 normalColor = normalize(v_Normal) * 0.5 + vec3(0.5, 0.5, 0.5);
    v_Color = vec4(normalColor, 1.0);
    if (all(equal(v_Normal, vec3(0.0, 0.0, 0.0)))) {
        v_Color = vec4(1, 1, 1, 1);
    }
}

void main() {
    vec4 position = u_ModelMatrix * a_Position;
    vec4 normal = normalize(vec4(a_Normal, 0.0));
    vec3 transformedNormal = normalize(vec3(u_NormalMatrix * normal));

    if (u_PopOut) {
        position += 0.03 * vec4(transformedNormal, 0.0);
    }
    position += u_WorldStretch * vec4(0, 0, sin(position.x + u_WorldStretchPhase) + sin(position.y), 0);

    gl_Position = u_ProjectionMatrix * position;
    gl_PointSize = 10.0;

    vec4 a_Color4 = vec4(a_Color.r, a_Color.g, a_Color.b, 1.0);

    v_Color = mix(u_ColorOverride, a_Color4, 1.0 - u_ColorOverride.a);
    vec3 v_Pos = vec3(position) / position.w;
    vec3 v_Normal = transformedNormal;

    if (!u_ShowNormals) {
        getColorFromLighting(v_Pos, v_Normal);
    } else {
        getColorFromNormal(v_Normal);
    }
}