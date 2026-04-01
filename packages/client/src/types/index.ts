export interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'user' | 'admin';
}

export interface Booking {
  id: number;
  user_id: number;
  user_full_name: string;
  lab_id: number;
  start_time: string;
  end_time: string;
  status: 'active' | 'cancelled';
  created_at: string;
}

export interface LabSettings {
  id: number;
  name: string;
  total_seats: number;
  work_start_time: string; // "HH:mm"
  work_end_time: string;
}

export interface DayStat {
  period: string;
  total_bookings: number;
  total_hours: number;
}

export interface HourAvailability {
  hour: string;
  available_seats: number;
  total_seats: number;
}
