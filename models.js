class Patient {
  constructor({ id, firstName, lastName, email, password }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.password = password;
  }

  static fromRow(row) {
    return new Patient({
      id: row.Pat_id,
      firstName: row.First_name,
      lastName: row.Last_name,
      email: row.Email,
      password: row.Password,
    });
  }
}

class Doctor {
  constructor({ id, firstName, lastName, email, password, speciality, rating }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.password = password;
    this.speciality = speciality;
    this.rating = rating;
  }

  static fromRow(row) {
    return new Doctor({
      id: row.Doc_id,
      firstName: row.First_name,
      lastName: row.Last_name,
      email: row.Email,
      password: row.Password,
      speciality: row.speciality || row.spectiality,
      rating: row.rating,
    });
  }

  toListItem() {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      speciality: this.speciality,
      rating: this.rating,
    };
  }
}

class Appointment {
  constructor({ id, patientId, doctorId, clinicId, assistantId, date, time, status }) {
    this.id = id;
    this.patientId = patientId;
    this.doctorId = doctorId;
    this.clinicId = clinicId;
    this.assistantId = assistantId;
    this.date = date;
    this.time = time;
    this.status = status || "Pending";
  }

  static fromRow(row) {
    return new Appointment({
      id: row.App_id,
      patientId: row.Pat_id,
      doctorId: row.Doc_id,
      clinicId: row.Cl_id,
      assistantId: row.As_id,
      date: row.Date,
      time: row.Time,
      status: row.Status,
    });
  }
}

class QueueEntry {
  constructor({ id, appointmentId, number, status }) {
    this.id = id;
    this.appointmentId = appointmentId;
    this.number = number;
    this.status = status || "Waiting";
  }

  static fromRow(row) {
    return new QueueEntry({
      id: row.Que_id,
      appointmentId: row.App_id,
      number: row.Number,
      status: row.Status,
    });
  }
}

class Payment {
  constructor({ id, appointmentId, amount, method, status }) {
    this.id = id;
    this.appointmentId = appointmentId;
    this.amount = amount;
    this.method = method;
    this.status = status || "Paid";
  }
}

module.exports = {
  Patient,
  Doctor,
  Appointment,
  QueueEntry,
  Payment,
};
