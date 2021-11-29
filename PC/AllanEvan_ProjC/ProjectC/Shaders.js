// TODO different VBO for each shader bc it just makes things easier

phongVertShader = `
uniform mat4 u_ModelMatrix;
uniform mat4 u_ProjectionMatrix;
uniform mat4 u_NormalMatrix;
uniform vec4 u_ColorOverride;
uniform bool u_PopOut;

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
  
  gl_Position = u_ProjectionMatrix * position;
  gl_PointSize = 10.0;

  vec4 a_Color4 = vec4(a_Color.r, a_Color.g, a_Color.b, 1.0);
  
  v_Color = mix(u_ColorOverride, a_Color4, 1.0 - u_ColorOverride.a);
  v_Pos = vec3(position) / position.w;
  v_Normal = transformedNormal;
}`;

phongFragShader = `
precision mediump float;

uniform vec3 u_CameraPos;
uniform bool u_ShowNormals;

varying vec4 v_Color;
varying vec3 v_Pos;
varying vec3 v_Normal;

void main() {
  if (!u_ShowNormals) {
    vec3 lightPos = vec3(0.0, 0.0, 10.0);
    vec3 ambientColor = vec3(0.5, 0.5, 0.5);
    vec3 diffuseColor = vec3(0.5, 0.5, 0.5);
    vec3 specularColor = vec3(1.0, 1.0, 1.0);
    float shininess = 1000.0;
    float Ka = 1.0;
    float Kd = 1.0;
    float Ks = 1.0;

    vec3 N = normalize(v_Normal);
    vec3 L = normalize(lightPos - v_Pos);

    float diffuse = max(dot(N, L), 0.0);
    float specular = 0.0;
    if (diffuse > 0.0) {
      vec3 R = reflect(-L, N);
      vec3 V = normalize(u_CameraPos - v_Pos);
      float specAngle = max(dot(R, V), 0.0);
      specular = pow(specAngle, shininess);
    }

    vec4 lighting = vec4(Ka * ambientColor + Kd * diffuse * diffuseColor + Ks * specular * specularColor, 1.0);

    gl_FragColor = v_Color * lighting;
  } else {
    vec3 normalColor = normalize(v_Normal) * 0.5 + vec3(0.5, 0.5, 0.5);
    vec4 a_Color4 = vec4(normalColor, 1.0);
    if (all(equal(v_Normal, vec3(0.0, 0.0, 0.0)))) {
      a_Color4 = vec4(1, 1, 1, 1);
    }
    gl_FragColor = a_Color4;
  }
}`;

phongAttribs = ['a_Position', 'a_Color', 'a_Normal', 'u_ModelMatrix', 'u_ProjectionMatrix', 'u_NormalMatrix', 'u_ColorOverride', 'u_ShowNormals', 'u_PopOut', 'u_CameraPos'];

flatVertShader = `
uniform mat4 u_ModelMatrix;
uniform mat4 u_ProjectionMatrix;
uniform vec4 u_ColorOverride;

attribute vec4 a_Position;
attribute vec3 a_Color;

varying vec4 v_Color;

void main() {
  vec4 position = u_ModelMatrix * a_Position;
  
  gl_Position = u_ProjectionMatrix * position;
  gl_PointSize = 10.0;

  vec4 a_Color4 = vec4(a_Color.r, a_Color.g, a_Color.b, 1.0);
  
  v_Color = mix(u_ColorOverride, a_Color4, 1.0 - u_ColorOverride.a);
}`;

flatFragShader = `
precision mediump float;

varying vec4 v_Color;

void main() {
  gl_FragColor = v_Color;
}`;

flatAttribs = ['a_Position', 'a_Color', 'u_ModelMatrix', 'u_ProjectionMatrix', 'u_ColorOverride'];