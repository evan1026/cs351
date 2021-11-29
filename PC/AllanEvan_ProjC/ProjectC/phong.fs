// Even though the shaders are coded into the javascript, I have this file so I can get syntax highlighting. Then I just copy+paste to the javascript

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
}