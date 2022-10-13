#include "GeometryShader.h"
#include "Util/Log.h"


namespace Core
{
	GeometryShader::GeometryShader(std::string filePath)
		: Shader(filePath)
	{
		id = glCreateShader(GL_GEOMETRY_SHADER);
		const char* sourceStr = source.c_str();
		glShaderSource(getID(), 1, &sourceStr, NULL);
		glCompileShader(getID());

		int success;
		char log[512];
		glGetShaderiv(getID(), GL_COMPILE_STATUS, &success);
		if (!success)
		{
			glGetShaderInfoLog(getID(), 512, NULL, log);
			Core::Print("ERROR::SHADER::GEOMETRY::COMPILATION_FAILED\n", log);
		}
	}

}