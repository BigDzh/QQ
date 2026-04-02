import type { Project, Module, Component, Document, Software, ProjectStage } from '../types';

export interface ModuleAssemblyData {
  projectName: string;
  projectNumber: string;
  projectStage: ProjectStage;
  totalModules: number;
  totalComponents: number;
  modules: {
    id: string;
    name: string;
    number: string;
    category: string;
    status: string;
    stage: string;
    componentCount: number;
    components: ComponentAssemblyData[];
  }[];
}

export interface ComponentAssemblyData {
  id: string;
  number: string;
  name: string;
  productionOrderNumber: string;
  status: string;
  holder?: string;
  stage?: string;
  version?: string;
  burnedSoftwareCount: number;
}

export interface ComponentMatchingTableRow {
  moduleNumber: string;
  moduleName: string;
  componentNumber: string;
  componentName: string;
  productionOrderNumber: string;
  status: string;
  holder?: string;
  stage?: string;
  version?: string;
  burnedSoftware: string[];
}

export interface DiagramResult {
  moduleAssembly: {
    text: string;
    data: ModuleAssemblyData;
  };
  componentAssembly: {
    text: string;
    data: ComponentAssemblyData[];
  };
  componentTable: {
    text: string;
    data: ComponentMatchingTableRow[];
  };
}

function padRight(str: string, len: number): string {
  return str.padEnd(len, ' ');
}

function padCenter(str: string, len: number): string {
  const padding = len - str.length;
  if (padding <= 0) return str;
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
}

function repeatChar(char: string, len: number): string {
  return char.repeat(len);
}

export function generateModuleAssemblyDiagram(project: Project): ModuleAssemblyData {
  const modules = project.modules || [];
  const moduleData: ModuleAssemblyData = {
    projectName: project.name,
    projectNumber: project.projectNumber,
    projectStage: project.stage,
    totalModules: modules.length,
    totalComponents: modules.reduce((sum, m) => sum + (m.components || []).length, 0),
    modules: modules.map((module: Module) => ({
      id: module.id,
      name: module.moduleName,
      number: module.moduleNumber,
      category: module.category,
      status: module.status,
      stage: module.stage,
      componentCount: (module.components || []).length,
      components: (module.components || []).map((comp: Component) => ({
        id: comp.id,
        number: comp.componentNumber,
        name: comp.componentName,
        productionOrderNumber: comp.productionOrderNumber,
        status: comp.status,
        holder: comp.holder,
        stage: comp.stage,
        version: comp.version,
        burnedSoftwareCount: comp.burnedSoftware?.length || 0,
      })),
    })),
  };

  return moduleData;
}

export function generateModuleAssemblyText(data: ModuleAssemblyData): string {
  const lines: string[] = [];
  const width = 120;
  const innerWidth = width - 4;

  lines.push(repeatChar('═', width));
  lines.push('║' + padCenter('模块装配图', width - 4) + '║');
  lines.push('║' + padCenter(`${data.projectName} (${data.projectNumber})`, width - 4) + '║');
  lines.push('║' + padCenter(`阶段: ${data.projectStage}  |  模块数: ${data.totalModules}  |  组件数: ${data.totalComponents}`, width - 4) + '║');
  lines.push(repeatChar('═', width));

  for (const module of data.modules) {
    lines.push('');
    lines.push('┌' + repeatChar('─', innerWidth) + '┐');
    lines.push('│' + padRight(`📦 ${module.number}  ${module.name}`, innerWidth) + '│');
    lines.push('│' + padRight(`   类别: ${module.category}  |  状态: ${module.status}  |  阶段: ${module.stage}  |  组件: ${module.componentCount}个`, innerWidth) + '│');
    lines.push('├' + repeatChar('─', innerWidth) + '┤');

    if (module.components.length === 0) {
      lines.push('│' + padCenter('暂无组件', innerWidth) + '│');
    } else {
      lines.push('│' + padRight('   组件列表:', innerWidth) + '│');
      for (const comp of module.components) {
        const swInfo = comp.burnedSoftwareCount > 0 ? ` [🔥${comp.burnedSoftwareCount}]` : '';
        lines.push('│' + padRight(`     ├─ ${comp.number}  ${comp.name}${swInfo}`, innerWidth) + '│');
        lines.push('│' + padRight(`     │   状态: ${comp.status}  |  负责人: ${comp.holder || '-'}  |  阶段: ${comp.stage || '-'}`, innerWidth) + '│');
      }
    }
    lines.push('└' + repeatChar('─', innerWidth) + '┘');
  }

  lines.push('');
  lines.push(repeatChar('═', width));
  lines.push('║' + padCenter(`生成时间: ${new Date().toLocaleString()}`, width - 4) + '║');
  lines.push(repeatChar('═', width));

  return lines.join('\n');
}

export function generateComponentAssemblyText(components: Component[], moduleName?: string): string {
  const lines: string[] = [];
  const width = 120;
  const innerWidth = width - 4;

  lines.push(repeatChar('═', width));
  lines.push('║' + padCenter('组件装配图', width - 4) + '║');
  if (moduleName) {
    lines.push('║' + padCenter(`模块: ${moduleName}`, width - 4) + '║');
  }
  lines.push('║' + padCenter(`组件数量: ${components.length}`, width - 4) + '║');
  lines.push(repeatChar('═', width));

  lines.push('');
  lines.push('┌' + repeatChar('─', innerWidth) + '┐');
  lines.push('│' + padRight('  序号  组件编号       组件名称                    状态      负责人    版本', innerWidth) + '│');
  lines.push('├' + repeatChar('─', innerWidth) + '┤');

  components.forEach((comp, index) => {
    const row = `│${padRight((index + 1).toString(), 6)}${padRight(comp.componentNumber, 17)}${padRight(comp.componentName, 28)}${padRight(comp.status, 10)}${padRight(comp.holder || '-', 10)}${padRight(comp.version || '-', 8)}│`;
    lines.push(row.substring(0, width - 1) + (row.length >= width - 1 ? '' : '│'));
  });

  lines.push('└' + repeatChar('─', innerWidth) + '┘');
  lines.push('');
  lines.push(repeatChar('═', width));
  lines.push('║' + padCenter(`生成时间: ${new Date().toLocaleString()}`, width - 4) + '║');
  lines.push(repeatChar('═', width));

  return lines.join('\n');
}

export function generateComponentTableText(rows: ComponentMatchingTableRow[]): string {
  const lines: string[] = [];
  const width = 140;
  const innerWidth = width - 4;

  lines.push(repeatChar('═', width));
  lines.push('║' + padCenter('组件配套表', width - 4) + '║');
  lines.push('║' + padCenter(`配套项目数: ${rows.length}`, width - 4) + '║');
  lines.push(repeatChar('═', width));

  lines.push('');
  lines.push('┌' + repeatChar('─', innerWidth) + '┐');
  const header = '│  模块编号       模块名称              组件编号       组件名称                    生产订单号        状态      负责人    烧录软件                                                                                  │';
  lines.push(header.substring(0, width - 1) + (header.length >= width - 1 ? '' : '│'));
  lines.push('├' + repeatChar('─', innerWidth) + '┤');

  rows.forEach((row, index) => {
    const swList = row.burnedSoftware.length > 0 ? row.burnedSoftware.join(', ') : '-';
    const rowStr = `│${padRight((index + 1).toString(), 4)}${padRight(row.moduleNumber, 17)}${padRight(row.moduleName, 22)}${padRight(row.componentNumber, 17)}${padRight(row.componentName, 28)}${padRight(row.productionOrderNumber, 18)}${padRight(row.status, 10)}${padRight(row.holder || '-', 10)}${padRight(swList, 60)}│`;
    lines.push(rowStr.substring(0, width - 1) + (rowStr.length >= width - 1 ? '' : '│'));
  });

  lines.push('└' + repeatChar('─', innerWidth) + '┘');
  lines.push('');
  lines.push(repeatChar('═', width));
  lines.push('║' + padCenter(`生成时间: ${new Date().toLocaleString()}`, width - 4) + '║');
  lines.push(repeatChar('═', width));

  return lines.join('\n');
}

export function generateAllDiagrams(project: Project): DiagramResult {
  const moduleAssemblyData = generateModuleAssemblyDiagram(project);

  const allComponents: Component[] = [];
  project.modules.forEach((module: Module) => {
    module.components.forEach((comp: Component) => {
      allComponents.push(comp);
    });
  });

  const componentTableRows: ComponentMatchingTableRow[] = [];
  project.modules.forEach((module: Module) => {
    module.components.forEach((comp: Component) => {
      const burnedSw = comp.burnedSoftware?.map((sw) => `${sw.softwareName}(${sw.softwareVersion})`) || [];
      componentTableRows.push({
        moduleNumber: module.moduleNumber,
        moduleName: module.moduleName,
        componentNumber: comp.componentNumber,
        componentName: comp.componentName,
        productionOrderNumber: comp.productionOrderNumber,
        status: comp.status,
        holder: comp.holder,
        stage: comp.stage,
        version: comp.version,
        burnedSoftware: burnedSw,
      });
    });
  });

  return {
    moduleAssembly: {
      text: generateModuleAssemblyText(moduleAssemblyData),
      data: moduleAssemblyData,
    },
    componentAssembly: {
      text: generateComponentAssemblyText(allComponents),
      data: allComponents.map((comp) => ({
        id: comp.id,
        number: comp.componentNumber,
        name: comp.componentName,
        productionOrderNumber: comp.productionOrderNumber,
        status: comp.status,
        holder: comp.holder,
        stage: comp.stage,
        version: comp.version,
        burnedSoftwareCount: comp.burnedSoftware?.length || 0,
      })),
    },
    componentTable: {
      text: generateComponentTableText(componentTableRows),
      data: componentTableRows,
    },
  };
}

export function generateDocumentSummary(docs: Document[]): string {
  const lines: string[] = [];
  const width = 100;
  const innerWidth = width - 4;

  lines.push(repeatChar('═', width));
  lines.push('║' + padCenter('文档清单汇总', width - 4) + '║');
  lines.push(repeatChar('═', width));

  const stageGroups = new Map<ProjectStage, Document[]>();
  docs.forEach((doc) => {
    const stage = doc.stage;
    if (!stageGroups.has(stage)) {
      stageGroups.set(stage, []);
    }
    stageGroups.get(stage)!.push(doc);
  });

  const stages: ProjectStage[] = ['F阶段', 'C阶段', 'S阶段', 'D阶段', 'P阶段'];
  stages.forEach((stage) => {
    const stageDocs = stageGroups.get(stage) || [];
    if (stageDocs.length === 0) return;

    lines.push('');
    lines.push('┌' + repeatChar('─', innerWidth) + '┐');
    lines.push('│' + padRight(`${stage} (${stageDocs.length}个文档)`, innerWidth) + '│');
    lines.push('├' + repeatChar('─', innerWidth) + '┤');

    stageDocs.forEach((doc) => {
      const statusIcon = doc.status === '已完成' ? '✓' : '○';
      lines.push('│' + padRight(`  ${statusIcon} ${doc.name} [${doc.type}]`, innerWidth) + '│');
    });
  });

  lines.push('');
  lines.push(repeatChar('═', width));
  lines.push('║' + padCenter(`总计: ${docs.length}个文档`, width - 4) + '║');
  lines.push(repeatChar('═', width));

  return lines.join('\n');
}

export function generateSoftwareSummary(softwareList: Software[]): string {
  const lines: string[] = [];
  const width = 100;
  const innerWidth = width - 4;

  lines.push(repeatChar('═', width));
  lines.push('║' + padCenter('软件清单汇总', width - 4) + '║');
  lines.push(repeatChar('═', width));

  const stageGroups = new Map<ProjectStage, Software[]>();
  softwareList.forEach((sw) => {
    const stage = sw.stage;
    if (!stageGroups.has(stage)) {
      stageGroups.set(stage, []);
    }
    stageGroups.get(stage)!.push(sw);
  });

  const stages: ProjectStage[] = ['F阶段', 'C阶段', 'S阶段', 'D阶段', 'P阶段'];
  stages.forEach((stage) => {
    const stageSw = stageGroups.get(stage) || [];
    if (stageSw.length === 0) return;

    lines.push('');
    lines.push('┌' + repeatChar('─', innerWidth) + '┐');
    lines.push('│' + padRight(`${stage} (${stageSw.length}个软件)`, innerWidth) + '│');
    lines.push('├' + repeatChar('─', innerWidth) + '┤');

    stageSw.forEach((sw) => {
      const statusIcon = sw.status === '已完成' ? '✓' : '○';
      lines.push('│' + padRight(`  ${statusIcon} ${sw.name} [${sw.version}] MD5:${sw.md5?.substring(0, 8) || '-'}`, innerWidth) + '│');
    });
  });

  lines.push('');
  lines.push(repeatChar('═', width));
  lines.push('║' + padCenter(`总计: ${softwareList.length}个软件`, width - 4) + '║');
  lines.push(repeatChar('═', width));

  return lines.join('\n');
}
