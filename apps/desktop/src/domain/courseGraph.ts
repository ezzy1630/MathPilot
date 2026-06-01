import calc1Graph from '../../../../config/course_graphs/calculus_1.json'
import calc2Graph from '../../../../config/course_graphs/calculus_2.json'
import skillsExtension from '../../../../config/course_graphs/skills_extension.json'
import type { CourseFocus, Skill } from './types'

interface GraphSkill {
  id: string
  name: string
  area: string
  course: string
  type: 'procedural' | 'conceptual' | 'mixed'
  prerequisites: string[]
  supports: string[]
  commonMistakes: string[]
  resources: string[]
}

interface CourseGraphFile {
  course: string
  areas: string[]
  skills: GraphSkill[]
}

const CALC1 = calc1Graph as CourseGraphFile
const CALC2 = calc2Graph as CourseGraphFile

const CALC2_BRIDGE_IDS = new Set([
  'algebra_manipulation',
  'function_notation',
  'limits_intro',
  'derivative_rules_basic',
  'definite_integrals',
  'antiderivatives',
])

function normalize(skill: GraphSkill): Skill {
  const course =
    skill.course === 'Prerequisite'
      ? 'Prerequisite'
      : skill.course === 'Calculus 2'
        ? 'Calculus 2'
        : 'Calculus 1'
  return {
    id: skill.id,
    name: skill.name,
    area: skill.area,
    course,
    type: skill.type,
    prerequisites: skill.prerequisites,
    supports: skill.supports,
    commonMistakes: skill.commonMistakes,
    resources: skill.resources,
  }
}

function mergeExtension(skills: GraphSkill[]): GraphSkill[] {
  const ids = new Set(skills.map((s) => s.id))
  const extra = (skillsExtension as { skills: GraphSkill[] }).skills.filter((s) => !ids.has(s.id))
  return [...skills, ...extra]
}

export function skillsForCourse(focus: CourseFocus): Skill[] {
  const base = focus === 'Calculus 1' ? CALC1 : CALC2
  const primary = mergeExtension(base.skills).map(normalize)
  const byId = new Map(primary.map((skill) => [skill.id, skill]))

  if (focus === 'Calculus 2') {
    for (const skill of CALC1.skills.map(normalize)) {
      if ((skill.course === 'Prerequisite' || CALC2_BRIDGE_IDS.has(skill.id)) && !byId.has(skill.id)) {
        byId.set(skill.id, skill)
      }
    }
  }

  return [...byId.values()]
}

export function areasForCourse(focus: CourseFocus): string[] {
  return focus === 'Calculus 1' ? CALC1.areas : CALC2.areas
}
