import type { Project, Module, Component, ProjectStage, DesignFile } from '../types';

export interface DiagramCard {
  id: string;
  type: 'module-assembly' | 'component-assembly' | 'component-table';
  title: string;
  description: string;
  content: string;
  format: 'AutoCAD' | 'Excel';
  generatedAt: string;
  statistics: {
    modules?: number;
    components?: number;
    records?: number;
  };
}

const STAGE_ORDER: ProjectStage[] = ['F阶段', 'C阶段', 'S阶段', 'D阶段', 'P阶段'];

const padRight = (str: string, len: number): string => str.padEnd(len, ' ');

const padCenter = (str: string, len: number): string => {
  const padding = len - str.length;
  if (padding <= 0) return str;
  const leftPad = Math.floor(padding / 2);
  return ' '.repeat(leftPad) + str + ' '.repeat(padding - leftPad);
};

const repeatChar = (char: string, len: number): string => char.repeat(len);

const formatDate = (date: Date): string => date.toLocaleString('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const generateId = (prefix: string, id: string): string =>
  `${prefix}::${id}::${Date.now()}`;

export function generateModuleAssemblyForCAD(project: Project): {
  dxfContent: string;
  statistics: { modules: number; components: number };
} {
  const lines: string[] = [];
  const width = 120;
  const modules = project.modules || [];
  
  lines.push(repeatChar('-', width));
  lines.push(padCenter(`MODULE ASSEMBLY DRAWING - ${project.projectNumber}`, width));
  lines.push(padCenter(`PROJECT: ${project.name}`, width));
  lines.push(padCenter(`STAGE: ${project.stage}  DATE: ${formatDate(new Date())}`, width));
  lines.push(repeatChar('-', width));
  lines.push('');

  let yPos = 100;
  const moduleCount = modules.length;
  const componentCount = modules.reduce((sum, m) => sum + (m.components || []).length, 0);

  lines.push(`0,MODULE_COUNT,${moduleCount}`);
  lines.push(`0,COMPONENT_COUNT,${componentCount}`);
  lines.push('');
  lines.push(repeatChar('=', width));
  lines.push(padCenter('MODULE LIST', width));
  lines.push(repeatChar('=', width));
  lines.push('');

  lines.push(padRight('NO.', 6) + padRight('MODULE NUMBER', 20) + padRight('MODULE NAME', 35) + 
             padRight('CATEGORY', 15) + padRight('STATUS', 12) + padRight('COMPONENTS', 10));
  lines.push(repeatChar('-', width));

  modules.forEach((module, index) => {
    lines.push(
      padRight((index + 1).toString(), 6) +
      padRight(module.moduleNumber, 20) +
      padRight(module.moduleName, 35) +
      padRight(module.category, 15) +
      padRight(module.status, 12) +
      padRight((module.components || []).length.toString(), 10)
    );
    yPos += 20;
  });

  lines.push('');
  lines.push(repeatChar('=', width));
  lines.push(padCenter('MODULE DETAIL VIEW', width));
  lines.push(repeatChar('=', width));
  lines.push('');

  let moduleIndex = 0;
  const stageOrder: ProjectStage[] = ['F阶段', 'C阶段', 'S阶段', 'D阶段', 'P阶段'];

  stageOrder.forEach((stage) => {
    const stageModules = modules.filter((m) => m.stage === stage);
    if (stageModules.length === 0) return;

    lines.push(padCenter(`[ ${stage} ]`, width));
    lines.push('');
    moduleIndex = 0;

    stageModules.forEach((module) => {
      moduleIndex++;
      lines.push(`  ┌${repeatChar('─', width - 4)}┐`);
      lines.push(`  │ ${padRight(`M${moduleIndex}. ${module.moduleNumber}`, width - 4)} │`);
      lines.push(`  │ ${padRight(`Name: ${module.moduleName}`, width - 4)} │`);
      lines.push(`  │ ${padRight(`Category: ${module.category} | Status: ${module.status}`, width - 4)} │`);
      lines.push(`  ├${repeatChar('─', width - 4)}┤`);
      
      if ((module.components || []).length === 0) {
        lines.push(`  │ ${padCenter('[ NO COMPONENTS ]', width - 4)} │`);
      } else {
        lines.push(`  │ ${padRight('Component List:', width - 4)} │`);
        (module.components || []).forEach((comp, compIdx) => {
          const swCount = comp.burnedSoftware?.length || 0;
          const swTag = swCount > 0 ? ` [SW:${swCount}]` : '';
          lines.push(`  │   ${padRight(`${compIdx + 1}. ${comp.componentNumber} ${comp.componentName}${swTag}`, width - 6)} │`);
          lines.push(`  │     ${padRight(`Holder: ${comp.holder || '-'} | Stage: ${comp.stage || '-'}`, width - 6)} │`);
        });
      }
      lines.push(`  └${repeatChar('─', width - 4)}┘`);
      lines.push('');
    });
  });

  lines.push(repeatChar('=', width));
  lines.push(padCenter(`TOTAL: ${moduleCount} MODULES, ${componentCount} COMPONENTS`, width));
  lines.push(padCenter(`GENERATED: ${formatDate(new Date())}`, width));
  lines.push(repeatChar('=', width));

  return {
    dxfContent: lines.join('\n'),
    statistics: { modules: moduleCount, components: componentCount },
  };
}

export function generateComponentAssemblyForCAD(project: Project): {
  dxfContent: string;
  statistics: { components: number };
} {
  const lines: string[] = [];
  const width = 120;
  const modules = project.modules || [];
  
  lines.push(repeatChar('-', width));
  lines.push(padCenter(`COMPONENT ASSEMBLY DRAWING - ${project.projectNumber}`, width));
  lines.push(padCenter(`PROJECT: ${project.name}`, width));
  lines.push(padCenter(`STAGE: ${project.stage}  DATE: ${formatDate(new Date())}`, width));
  lines.push(repeatChar('-', width));
  lines.push('');

  const allComponents: Component[] = [];
  modules.forEach((module) => {
    allComponents.push(...(module.components || []));
  });

  lines.push(`0,COMPONENT_COUNT,${allComponents.length}`);
  lines.push('');
  lines.push(repeatChar('=', width));
  lines.push(padCenter('COMPONENT LIST', width));
  lines.push(repeatChar('=', width));
  lines.push('');

  lines.push(padRight('NO.', 6) + padRight('COMP NUMBER', 18) + padRight('COMP NAME', 28) + 
             padRight('STATUS', 10) + padRight('HOLDER', 12) + padRight('VERSION', 10) + 
             padRight('STAGE', 10) + padRight('SW COUNT', 8));
  lines.push(repeatChar('-', width));

  allComponents.forEach((comp, index) => {
    const swCount = comp.burnedSoftware?.length || 0;
    lines.push(
      padRight((index + 1).toString(), 6) +
      padRight(comp.componentNumber, 18) +
      padRight(comp.componentName, 28) +
      padRight(comp.status, 10) +
      padRight(comp.holder || '-', 12) +
      padRight(comp.version || '-', 10) +
      padRight(comp.stage || '-', 10) +
      padRight(swCount.toString(), 8)
    );
  });

  lines.push('');
  lines.push(repeatChar('=', width));
  lines.push(padCenter('COMPONENT BY STAGE', width));
  lines.push(repeatChar('=', width));
  lines.push('');

  const stageOrder: ProjectStage[] = ['F阶段', 'C阶段', 'S阶段', 'D阶段', 'P阶段'];
  
  stageOrder.forEach((stage) => {
    const stageComponents = allComponents.filter((c) => c.stage === stage);
    if (stageComponents.length === 0) return;

    lines.push(padCenter(`[ ${stage} ] - ${stageComponents.length} COMPONENTS`, width));
    lines.push(repeatChar('-', width));
    
    stageComponents.forEach((comp, index) => {
      const swCount = comp.burnedSoftware?.length || 0;
      lines.push(
        padRight((index + 1).toString(), 4) + ' ' +
        padRight(comp.componentNumber, 18) + ' ' +
        padRight(comp.componentName, 28) + ' ' +
        padRight(comp.status, 10) + ' ' +
        padRight(`SW:${swCount}`, 8)
      );
    });
    lines.push('');
  });

  lines.push(repeatChar('=', width));
  lines.push(padCenter(`TOTAL: ${allComponents.length} COMPONENTS`, width));
  lines.push(padCenter(`GENERATED: ${formatDate(new Date())}`, width));
  lines.push(repeatChar('=', width));

  return {
    dxfContent: lines.join('\n'),
    statistics: { components: allComponents.length },
  };
}

export async function generateComponentTableForExcel(project: Project): Promise<{
  data: any[];
  statistics: { records: number };
}> {
  const rows: any[] = [];
  let recordCount = 0;
  const modules = project.modules || [];

  rows.push({
    '模块编号': '项目信息',
    '模块名称': project.name,
    '组件编号': project.projectNumber,
    '组件名称': project.stage,
    '生产订单号': '',
    '状态': '',
    '负责人': '',
    '阶段': '',
    '版本': '',
    '烧录软件': '',
  });

  modules.forEach((module) => {
    if ((module.components || []).length === 0) {
      rows.push({
        '模块编号': module.moduleNumber,
        '模块名称': module.moduleName,
        '组件编号': '-',
        '组件名称': '-',
        '生产订单号': module.productionOrderNumber || '-',
        '状态': module.status,
        '负责人': module.holder || '-',
        '阶段': module.stage,
        '版本': module.version || '-',
        '烧录软件': '-',
      });
      recordCount++;
    } else {
      (module.components || []).forEach((comp) => {
        const swList = comp.burnedSoftware
          ?.map((sw) => `${sw.softwareName}(${sw.softwareVersion})`)
          .join(', ') || '-';
        
        rows.push({
          '模块编号': module.moduleNumber,
          '模块名称': module.moduleName,
          '组件编号': comp.componentNumber,
          '组件名称': comp.componentName,
          '生产订单号': comp.productionOrderNumber || '-',
          '状态': comp.status,
          '负责人': comp.holder || '-',
          '阶段': comp.stage || '-',
          '版本': comp.version || '-',
          '烧录软件': swList,
        });
        recordCount++;
      });
    }
  });

  return {
    data: rows,
    statistics: { records: recordCount },
  };
}

export async function downloadExcel(project: Project): Promise<void> {
  const { data } = await generateComponentTableForExcel(project);

  const XLSX = await import('xlsx');

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '组件配套表');

  const stageModules = (project.modules || []).reduce<Record<ProjectStage, Module[]>>(
    (acc, module) => {
      const stage = module.stage as ProjectStage;
      if (!acc[stage]) acc[stage] = [];
      acc[stage].push(module);
      return acc;
    },
    {} as Record<ProjectStage, Module[]>
  );

  STAGE_ORDER.forEach((stage) => {
    const modules = stageModules[stage];
    if (!modules || modules.length === 0) return;

    const stageRows: Record<string, string>[] = [];

    modules.forEach((module) => {
      if (module.components.length === 0) {
        stageRows.push({
          '模块编号': module.moduleNumber,
          '模块名称': module.moduleName,
          '组件编号': '-',
          '组件名称': '-',
          '生产订单号': module.productionOrderNumber || '-',
          '状态': module.status,
          '负责人': module.holder || '-',
          '阶段': module.stage,
          '版本': module.version || '-',
          '烧录软件': '-',
        });
      } else {
        module.components.forEach((comp) => {
          const swList = comp.burnedSoftware
            ?.map((sw) => `${sw.softwareName}(${sw.softwareVersion})`)
            .join(', ') || '-';

          stageRows.push({
            '模块编号': module.moduleNumber,
            '模块名称': module.moduleName,
            '组件编号': comp.componentNumber,
            '组件名称': comp.componentName,
            '生产订单号': comp.productionOrderNumber || '-',
            '状态': comp.status,
            '负责人': comp.holder || '-',
            '阶段': comp.stage || '-',
            '版本': comp.version || '-',
            '烧录软件': swList,
          });
        });
      }
    });

    const stageSheet = XLSX.utils.json_to_sheet(stageRows);
    XLSX.utils.book_append_sheet(workbook, stageSheet, stage);
  });

  const fileName = `${project.projectNumber}_${project.name}_组件配套表_${formatDate(new Date()).replace(/[/:]/g, '-').replace(/ /g, '_')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function generateDesignDiagrams(project: Project, existingDesignFiles?: DesignFile[]): DiagramCard[] {
  const cards: DiagramCard[] = [];
  const now = new Date().toISOString();
  const modules = project.modules || [];

  const existingModuleAssemblies = new Set<string>();
  const existingComponentAssemblies = new Set<string>();
  const existingComponentTables = new Set<string>();

  if (existingDesignFiles) {
    existingDesignFiles.forEach((df: DesignFile) => {
      if (df.isAutoGenerated) {
        if (df.category === 'module' && df.type === '装配图' && df.moduleId) {
          existingModuleAssemblies.add(df.moduleId);
        } else if (df.category === 'component' && df.type === '装配图' && df.componentId) {
          existingComponentAssemblies.add(df.componentId);
        } else if (df.category === 'component' && df.type === '配套表' && df.componentId) {
          existingComponentTables.add(df.componentId);
        }
      }
    });
  }

  modules.forEach((module) => {
    if (!existingModuleAssemblies.has(module.id)) {
      const moduleContent = generateSingleModuleAssemblyForCAD(module, project);
      cards.push({
        id: generateId('module-assembly', module.id),
        type: 'module-assembly',
        title: `${module.moduleName} 装配图`,
        description: `模块: ${module.moduleName} | 编号: ${module.moduleNumber} | 阶段: ${module.stage} | 版本: ${module.version}`,
        content: moduleContent,
        format: 'AutoCAD',
        generatedAt: now,
        statistics: {
          modules: 1,
          components: (module.components || []).length,
        },
      });
    }

    module.components.forEach((component) => {
      if (!existingComponentAssemblies.has(component.id)) {
        const compContent = generateSingleComponentAssemblyForCAD(component, module);
        cards.push({
          id: generateId('component-assembly', component.id),
          type: 'component-assembly',
          title: `${component.componentName} 装配图`,
          description: `组件: ${component.componentName} | 编号: ${component.componentNumber} | 阶段: ${component.stage || '-'} | 版本: ${component.version || '-'}`,
          content: compContent,
          format: 'AutoCAD',
          generatedAt: now,
          statistics: {
            components: 1,
          },
        });
      }

      if (!existingComponentTables.has(component.id)) {
        const tableContent = generateSingleComponentTableForExcel(component, module);
        cards.push({
          id: generateId('component-table', component.id),
          type: 'component-table',
          title: `${component.componentName} 配套表`,
          description: `组件: ${component.componentName} | 模块: ${module.moduleName} | 生产订单号: ${component.productionOrderNumber || '-'}`,
          content: tableContent,
          format: 'Excel',
          generatedAt: now,
          statistics: {
            records: 1,
          },
        });
      }
    });
  });

  return cards;
}

export function generateSingleModuleAssemblyForCAD(module: Module, project: Project): string {
  const lines: string[] = [];
  const width = 120;

  lines.push(repeatChar('-', width));
  lines.push(padCenter(`MODULE ASSEMBLY - ${module.moduleName}`, width));
  lines.push(padCenter(`Project: ${project.name} (${project.projectNumber})`, width));
  lines.push(padCenter(`Stage: ${module.stage} | Version: ${module.version}`, width));
  lines.push(repeatChar('-', width));
  lines.push('');

  lines.push(`Module Number: ${module.moduleNumber}`);
  lines.push(`Module Name: ${module.moduleName}`);
  lines.push(`Category: ${module.category}`);
  lines.push(`Status: ${module.status}`);
  lines.push(`Holder: ${module.holder || '-'}`);
  lines.push(`Production Order: ${module.productionOrderNumber || '-'}`);
  lines.push('');
  lines.push(repeatChar('=', width));
  lines.push(`COMPONENTS (${module.components.length})`);
  lines.push(repeatChar('=', width));
  lines.push('');

  if (module.components.length === 0) {
    lines.push('No components in this module.');
  } else {
    lines.push(padRight('No.', 5) + padRight('Comp Number', 18) + padRight('Comp Name', 28) + padRight('Status', 10) + padRight('Holder', 12) + padRight('Stage', 10));
    lines.push(repeatChar('-', width));
    module.components.forEach((comp, idx) => {
      lines.push(
        padRight((idx + 1).toString(), 5) +
        padRight(comp.componentNumber, 18) +
        padRight(comp.componentName, 28) +
        padRight(comp.status, 10) +
        padRight(comp.holder || '-', 12) +
        padRight(comp.stage || '-', 10)
      );
    });
  }

  lines.push('');
  lines.push(repeatChar('=', width));
  lines.push(`Generated: ${formatDate(new Date())}`);
  lines.push(repeatChar('=', width));

  return lines.join('\n');
}

export function generateSingleComponentAssemblyForCAD(component: Component, module: Module): string {
  const lines: string[] = [];
  const width = 120;

  lines.push(repeatChar('-', width));
  lines.push(padCenter(`COMPONENT ASSEMBLY - ${component.componentName}`, width));
  lines.push(padCenter(`Module: ${module.moduleName} | Component No: ${component.componentNumber}`, width));
  lines.push(repeatChar('-', width));
  lines.push('');

  lines.push(`Component Number: ${component.componentNumber}`);
  lines.push(`Component Name: ${component.componentName}`);
  lines.push(`Status: ${component.status}`);
  lines.push(`Holder: ${component.holder || '-'}`);
  lines.push(`Stage: ${component.stage || '-'}`);
  lines.push(`Version: ${component.version || '-'}`);
  lines.push(`Production Order: ${component.productionOrderNumber || '-'}`);
  lines.push(`Repair Order: ${component.repairOrderNumber || '-'}`);
  lines.push(`Protection Order: ${component.protectionOrderNumber || '-'}`);
  lines.push('');

  lines.push(repeatChar('=', width));
  lines.push(`BURNED SOFTWARE (${component.burnedSoftware?.length || 0})`);
  lines.push(repeatChar('=', width));
  lines.push('');

  if (!component.burnedSoftware || component.burnedSoftware.length === 0) {
    lines.push('No burned software.');
  } else {
    lines.push(padRight('No.', 5) + padRight('Software Name', 30) + padRight('Version', 15) + padRight('Burned At', 20));
    lines.push(repeatChar('-', width));
    component.burnedSoftware.forEach((sw, idx) => {
      lines.push(
        padRight((idx + 1).toString(), 5) +
        padRight(sw.softwareName, 30) +
        padRight(sw.softwareVersion, 15) +
        padRight(sw.burnedAt, 20)
      );
    });
  }

  lines.push('');
  lines.push(repeatChar('=', width));
  lines.push(`Generated: ${formatDate(new Date())}`);
  lines.push(repeatChar('=', width));

  return lines.join('\n');
}

export function generateSingleComponentTableForExcel(component: Component, module: Module): string {
  const lines: string[] = [];
  const width = 120;

  lines.push(repeatChar('=', width));
  lines.push(padCenter(`COMPONENT MATCHING TABLE`, width));
  lines.push(padCenter(`${component.componentName}`, width));
  lines.push(repeatChar('=', width));
  lines.push('');

  lines.push('MODULE INFORMATION');
  lines.push(repeatChar('-', width));
  lines.push(`Module Number:    ${module.moduleNumber}`);
  lines.push(`Module Name:      ${module.moduleName}`);
  lines.push(`Category:         ${module.category}`);
  lines.push(`Status:          ${module.status}`);
  lines.push(`Stage:           ${module.stage}`);
  lines.push(`Version:         ${module.version}`);
  lines.push(`Production Order: ${module.productionOrderNumber || '-'}`);
  lines.push('');

  lines.push('COMPONENT INFORMATION');
  lines.push(repeatChar('-', width));
  lines.push(`Component Number:   ${component.componentNumber}`);
  lines.push(`Component Name:     ${component.componentName}`);
  lines.push(`Status:            ${component.status}`);
  lines.push(`Holder:            ${component.holder || '-'}`);
  lines.push(`Stage:             ${component.stage || '-'}`);
  lines.push(`Version:           ${component.version || '-'}`);
  lines.push(`Production Order:  ${component.productionOrderNumber || '-'}`);
  lines.push(`Repair Order:      ${component.repairOrderNumber || '-'}`);
  lines.push(`Protection Order:  ${component.protectionOrderNumber || '-'}`);
  lines.push('');

  lines.push('BURNED SOFTWARE LIST');
  lines.push(repeatChar('-', width));
  
  if (!component.burnedSoftware || component.burnedSoftware.length === 0) {
    lines.push('No burned software recorded.');
  } else {
    lines.push(padRight('No.', 5) + padRight('Software Name', 35) + padRight('Version', 15) + padRight('Burned At', 25));
    lines.push(repeatChar('-', width));
    component.burnedSoftware.forEach((sw, idx) => {
      lines.push(
        padRight((idx + 1).toString(), 5) +
        padRight(sw.softwareName || '-', 35) +
        padRight(sw.softwareVersion || '-', 15) +
        padRight(sw.burnedAt || '-', 25)
      );
    });
  }
  
  lines.push('');
  lines.push(repeatChar('=', width));
  lines.push(`Generated: ${formatDate(new Date())}`);
  lines.push(repeatChar('=', width));

  return lines.join('\n');
}
