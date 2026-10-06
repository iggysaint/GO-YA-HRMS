import { supabase } from './supabase';

interface Organization {
  id: string;
  name: string;
  slug: string;
  industry?: string;
  country?: string;
  timezone?: string;
  created_at: string;
}

interface Department {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  created_at: string;
}

interface Employee {
  id: string;
  company_id: string;
  department_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  status: 'active' | 'onboarding' | 'offboarding' | 'offboarded';
  hire_date: string;
  created_at: string;
}

interface EmployeeWithDepartment extends Employee {
  department?: Department;
}

/**
 * Get organization by ID
 */
export async function getOrganizationById(organizationId: string): Promise<Organization | null> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();
    
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Get departments for an organization
 */
export async function getDepartmentsByOrganization(organizationId: string): Promise<Department[]> {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('company_id', organizationId);
    
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

/**
 * Get department by ID
 */
export async function getDepartmentById(departmentId: string): Promise<Department | null> {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('id', departmentId)
      .single();
    
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Get employees for an organization
 */
export async function getEmployeesByOrganization(organizationId: string): Promise<Employee[]> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', organizationId);
    
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

/**
 * Get employees for an organization with department details
 */
export async function getEmployeesWithDepartments(organizationId: string): Promise<EmployeeWithDepartment[]> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*, departments(*)')
      .eq('company_id', organizationId);
    
    if (error || !data) return [];
    
    return data.map(emp => ({
      ...emp,
      department: emp.departments || undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Get employee by ID
 */
export async function getEmployeeById(employeeId: string, organizationId: string): Promise<Employee | null> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .eq('company_id', organizationId)
      .single();
    
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Get employee by ID with department details
 */
export async function getEmployeeWithDepartment(employeeId: string, organizationId: string): Promise<EmployeeWithDepartment | null> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*, departments(*)')
      .eq('id', employeeId)
      .eq('company_id', organizationId)
      .single();
    
    if (error || !data) return null;
    
    return {
      ...data,
      department: data.departments || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Create a new employee
 */
export async function createEmployee(employee: Omit<Employee, 'id' | 'created_at'>): Promise<Employee | null> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .insert(employee)
      .select()
      .single();
    
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Update an employee
 */
export async function updateEmployee(employeeId: string, organizationId: string, updates: Partial<Employee>): Promise<Employee | null> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', employeeId)
      .eq('company_id', organizationId)
      .select()
      .single();
    
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Delete an employee
 */
export async function deleteEmployee(employeeId: string, organizationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', employeeId)
      .eq('company_id', organizationId);
    
    return !error;
  } catch {
    return false;
  }
}
