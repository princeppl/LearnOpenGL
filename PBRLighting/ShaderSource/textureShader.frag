#version 330 core
out vec4 FragColor;
in vec2 TexCoords;
in vec3 WorldPos;
in vec3 Normal;

const float PI = 3.14159265359;

uniform vec3 camPos;
uniform sampler2D normalMap;
uniform sampler2D albedoMap;
uniform sampler2D metallicMap;
uniform sampler2D roughnessMap;
uniform sampler2D aoMap;
uniform vec3 lightPositions[4];
uniform vec3 lightColors[4];

vec3 getNormalFromMap();
float DistributionGGX(vec3 N, vec3 H, float roughness);
float GeometrySchlickGGX(float NdotV, float roughness);
float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness);
vec3 fresnelSchlick(float cosTheta, vec3 F0);

void main()
{
    //---------------
    //vec3 N = normalize(Normal);//法线
    vec3 V = normalize(camPos - WorldPos);//视线
    vec3 N = getNormalFromMap();//法线

    vec3 albedo = pow(texture(albedoMap, TexCoords).rgb, vec3(2.2));//颜色纹理一般在sRGB空间上
    float metallic = texture(metallicMap, TexCoords).r;
    float roughness = texture(roughnessMap, TexCoords).r;
    float ao = texture(aoMap, TexCoords).r;
    
    vec3 F0 = vec3(0.04);//基础反射率
    F0 = mix(F0, albedo, metallic);
    //---------------
    vec3 Lo = vec3(0.0);
    for(int i = 0; i < 4; i++)
    {
        //------------Radiance--------------
        vec3 L = normalize(lightPositions[i] - WorldPos);
        vec3 H = normalize(V + L);

        float dist = length(lightPositions[i] - WorldPos);
        float attenuation = 1.0 / (dist * dist);
        vec3 radiance = lightColors[i] * attenuation;

        //------------BRDF--------------

        //fresnel
        float HdotV = max(dot(H, V), 0.0);
        vec3 F = fresnelSchlick(HdotV, F0);

        //NDF
        float NDF = DistributionGGX(N, H, roughness);

        //Geometry
        float G = GeometrySmith(N, V, L, roughness);

        float NdotV = max(dot(N, V), 0.0);
        float NdotL = max(dot(N, L), 0.0);
        vec3 nominator = NDF * G * F;
        float denominator = 4.0 * NdotV * NdotL + 0.001;//防止除0
        vec3 specular = nominator / denominator;

        vec3 kS = F;
        vec3 kD = vec3(1.0) - kS;
        kD *= 1.0 - metallic;//金属吸收的能量

        //------------Lo--------------
        Lo += (kD * albedo / PI + specular) * radiance * NdotL;
    }

    //ambient
    vec3 ambient = vec3(0.03) * albedo * ao;
    vec3 color = ambient + Lo;

    //gamma
    color = color / (color + vec3(1.0));
    color = pow(color, vec3(1.0/2.2));

    FragColor = vec4(color, 1.0);
}

vec3 getNormalFromMap()
{
    //把切线空间法线转化到世界空间去
    vec3 tangentNormal = texture(normalMap, TexCoords).xyz * 2 - 1.0;

    vec3 Q1 = dFdx(WorldPos);
    vec3 Q2 = dFdy(WorldPos);
    vec2 st1 = dFdx(TexCoords);
    vec2 st2 = dFdy(TexCoords);

    vec3 N = normalize(Normal);
    vec3 T = normalize(Q1*st2.t - Q2*st1.t);
    vec3 B = -normalize(cross(N, T));
    mat3 TBN = mat3(T, B, N);

    return normalize(TBN * tangentNormal);
}

/*
* 入射辐射率计算实现
* 对应反射率方程中Li(p, wi)n·wi的部分
vec3 lightColor = vec3(23.47, 21.31, 20.79);
vec3 wi = normalize(lightPos - fragPos);
float cosTheta = max(dot(N, Wi), 0.0);
float attenuation = calculateAttenuation(fragPos, lightPos);

//Li(p, wi) = lightColor * attenuation
//n·wi = cosTheta
float radiance = lightColor * attenuation * cosTheta;
*/

vec3 fresnelSchlick(float cosTheta, vec3 F0)
{
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}

float DistributionGGX(vec3 N, vec3 H, float roughness)
{
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;

    float nom = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;

    return nom / denom;
}

float GeometrySchlickGGX(float NdotV, float roughness)
{
    float r = roughness + 1.0;
    float k = (r * r) / 8.0;

    float nom = NdotV;
    float denom = NdotV * (1.0 - k) + k;

    return nom / denom;
}

float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness)
{
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);

    float ggx2 = GeometrySchlickGGX(NdotV, roughness);
    float ggx1 = GeometrySchlickGGX(NdotL, roughness);

    return ggx1 * ggx2;
}