// TODO different VBO for each shader bc it just makes things easier

phongVertShader = `
uniform mat4 u_ModelMatrix;
uniform mat4 u_ProjectionMatrix;
uniform mat4 u_NormalMatrix;
uniform bool u_PopOut;
uniform float u_WorldStretch;
uniform float u_WorldStretchPhase;

attribute vec4 a_Position;
attribute vec3 a_Color;
attribute vec3 a_Normal;

varying vec4 v_Color;
varying vec3 v_Pos;
varying vec3 v_Normal;

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

    v_Color = vec4(a_Color.r, a_Color.g, a_Color.b, 1.0);
    v_Pos = vec3(position) / position.w;
    v_Normal = transformedNormal;
}
`;

phongFragShader = `
precision mediump float;

struct Material {
    vec3 Ka;
    vec3 Kd;
    vec3 Ks;
    float shininess;
};

struct Light {
    vec3 pos;
    vec3 Ia;
    vec3 Id;
    vec3 Is;
};

uniform vec3 u_CameraPos;
uniform bool u_ShowNormals;
uniform Material u_Material;
uniform Light u_Light;
uniform bool u_BlinnLighting;
uniform bool u_UseVertColors;

varying vec4 v_Color;
varying vec3 v_Pos;
varying vec3 v_Normal;

void getColorFromLighting() {
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

    vec3 albedo;
    if (u_UseVertColors) {
        albedo = v_Color.rgb;
    } else {
        albedo = u_Material.Ka;
    }

    gl_FragColor = vec4(albedo * u_Light.Ia + u_Material.Kd * diffuse * u_Light.Id + u_Material.Ks * specular * u_Light.Is, 1.0);
}

void getColorFromNormals() {
    vec3 normalColor = normalize(v_Normal) * 0.5 + vec3(0.5, 0.5, 0.5);
    vec4 a_Color4 = vec4(normalColor, 1.0);
    if (all(equal(v_Normal, vec3(0.0, 0.0, 0.0)))) {
      a_Color4 = vec4(1, 1, 1, 1);
    }
    gl_FragColor = a_Color4;
}

void main() {
    if (!u_ShowNormals) {
        getColorFromLighting();
    } else {
        getColorFromNormals();
    }
}
`;

phongAttribs = ['a_Position', 'a_Color', 'a_Normal', 'u_ModelMatrix', 'u_ProjectionMatrix', 'u_NormalMatrix', 'u_ShowNormals', 'u_PopOut', 'u_CameraPos', 'u_WorldStretch', 'u_WorldStretchPhase', 'u_BlinnLighting', 'u_UseVertColors'];

flatVertShader = `
uniform mat4 u_ModelMatrix;
uniform mat4 u_ProjectionMatrix;
uniform vec4 u_ColorOverride;
uniform float u_WorldStretch;
uniform float u_WorldStretchPhase;

attribute vec4 a_Position;
attribute vec3 a_Color;

varying vec4 v_Color;

void main() {
  vec4 position = u_ModelMatrix * a_Position;
  position += u_WorldStretch * vec4(0, 0, sin(position.x + u_WorldStretchPhase) + sin(position.y), 0);
  
  gl_Position = u_ProjectionMatrix * position;
  gl_PointSize = 10.0;

  v_Color = vec4(a_Color.r, a_Color.g, a_Color.b, 1.0);
}`;

flatFragShader = `
precision mediump float;

varying vec4 v_Color;

void main() {
  gl_FragColor = v_Color;
}`;

flatAttribs = ['a_Position', 'a_Color', 'u_ModelMatrix', 'u_ProjectionMatrix', 'u_WorldStretch', 'u_WorldStretchPhase'];

garaudVertShader = `
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
uniform bool u_PopOut;
uniform vec3 u_CameraPos;
uniform bool u_ShowNormals;
uniform Material u_Material;
uniform Light u_Light;
uniform float u_WorldStretch;
uniform float u_WorldStretchPhase;
uniform bool u_BlinnLighting;
uniform bool u_UseVertColors;

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

    vec3 albedo;
    if (u_UseVertColors) {
        albedo = a_Color;
    } else {
        albedo = u_Material.Ka;
    }

    vec4 lighting = vec4(albedo * u_Light.Ia + u_Material.Kd * diffuse * u_Light.Id + u_Material.Ks * specular * u_Light.Is, 1.0);

    v_Color = lighting;
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

    v_Color = vec4(a_Color.r, a_Color.g, a_Color.b, 1.0);
    vec3 v_Pos = vec3(position) / position.w;
    vec3 v_Normal = transformedNormal;

    if (!u_ShowNormals) {
        getColorFromLighting(v_Pos, v_Normal);
    } else {
        getColorFromNormal(v_Normal);
    }
}
`;

garaudFragShader = flatFragShader;

garaudAttribs = ['a_Position', 'a_Color', 'a_Normal', 'u_ModelMatrix', 'u_ProjectionMatrix', 'u_NormalMatrix', 'u_ShowNormals', 'u_PopOut', 'u_CameraPos', 'u_WorldStretchPhase', 'u_BlinnLighting', 'u_UseVertColors'];
