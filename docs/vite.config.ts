import { ConfigsManager } from 'sborshik/utils/configs-manager';
import { defineDocsBuildConfig } from "sborshik/vitepress";

import { circularVmPayloadDependencyTestCases } from '../src/hoc/with-view-model.test.fixture';

const configs = ConfigsManager.create('../'); 

export default defineDocsBuildConfig(configs, {
  plugins: [
    {
      name: 'vitepress-useless-fix',
      transform(code: string, id: string) {
        if (!id.endsWith('.md')) return;

        return code.replace(
          `{circularVmPayloadDependencyTestCases}`,
          circularVmPayloadDependencyTestCases
            .filter(it => it.isRecursion)
            .map(it => JSON.stringify(it.vmConfig, null, 2))
            .map(it => `
\`\`\`json
${it}
\`\`\`
`)
            .join('\n')
        )   
      }
    }
  ]
} as any); 
