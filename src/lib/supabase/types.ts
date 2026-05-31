export type ScholarshipType = "none" | "half" | "full";

export type Grade = {
  id: string;
  name: string;
  monthly_fee: number;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type Student = {
  id: string;
  registration_number: string;
  full_name: string;
  grade_id: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  address: string | null;
  scholarship_type: ScholarshipType;
  is_active: boolean;
  admission_date: string | null;
  created_at: string;
  updated_at: string;
  // joined
  grade?: Grade;
};

export type FeeChallan = {
  id: string;
  student_id: string;
  month: number;
  year: number;
  due_date: string;
  tuition_fee: number;
  stationary_fee: number;
  security_fee: number;
  admission_fee: number;
  mcs_fee: number;
  late_fee: number;
  arrears: number;
  discount: number;
  total: number;
  is_paid: boolean;
  paid_at: string | null;
  paid_by: string | null;
  payment_notes: string | null;
  scholarship_type: ScholarshipType;
  generated_at: string;
  created_at: string;
  updated_at: string;
  // joined
  student?: Student;
};

export type Setting = {
  id: string;
  key: string;
  value: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      grades: {
        Row: Grade;
        Insert: Omit<Grade, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Grade, "id" | "created_at" | "updated_at">>;
      };
      students: {
        Row: Student;
        Insert: Omit<Student, "id" | "created_at" | "updated_at" | "grade">;
        Update: Partial<
          Omit<Student, "id" | "created_at" | "updated_at" | "grade">
        >;
      };
      fee_challans: {
        Row: FeeChallan;
        Insert: Omit<
          FeeChallan,
          "id" | "created_at" | "updated_at" | "student"
        >;
        Update: Partial<
          Omit<FeeChallan, "id" | "created_at" | "updated_at" | "student">
        >;
      };
      settings: {
        Row: Setting;
        Insert: Omit<Setting, "id" | "updated_at">;
        Update: Partial<Omit<Setting, "id" | "updated_at">>;
      };
    };
  };
};
