const ApiError = require('../helpers/apiError')
const { Hotel } = require('../models/hotel')

const Reservation = require('../models/reservation')
const { calculateDays } = require('../helpers/calculateDays')

exports.addRoom = async (req) => {
  const hotel = await Hotel.find({ _id: req.params.hotelId })
  if (!hotel) throw new ApiError(400, 'Hotel with provided ID was not found.')

  const rooms = req.body.map((item) => {
    const room = {
      roomNumber: item.roomNumber,
      beds: {
        single: item.beds.single,
        double: item.beds.double,
      },
      price: item.price,
      description: item.description,
    }

    return room
  })

  await Hotel.updateOne({ $push: { rooms: rooms } })

  return rooms
}

exports.getHotels = async (data) => {
  const hotels = await Hotel.find({ ownerId: data })

  return hotels
}

exports.addHotel = async (data) => {
  const hotel = new Hotel(data)
  await hotel.save()
  return hotel
}

exports.updateHotel = async (id, data) => {
  const hotelUpdate = await Hotel.findByIdAndUpdate(id, data)

  if (!hotelUpdate) {
    throw new ApiError(404, 'Hotel not found.')
  }
  const hotel = await Hotel.findById(id)

  return hotel
}

exports.deleteHotel = async (ownerId, id, isForceDelete) => {
  const hotel = await Hotel.findById(id)
  if (hotel.ownerId !== ownerId) throw new ApiError(403, 'Forbidden')
  const reservation = await Reservation.find({ hotel: id })

  if (reservation.length > 0 && !isForceDelete) {
    throw new ApiError(
      400,
      'Remove reservations first or set flag force to true, please'
    )
  }

  if (reservation.length > 0 && isForceDelete) {
    await Reservation.deleteMany({ hotel: id })
  }

  await Hotel.findByIdAndDelete(id)
}

exports.deleteReservation = async (id) => {
  const reservation = await Reservation.findByIdAndDelete(id)
  if (!reservation) {
    throw new ApiError(404, 'Reservation with given ID was not found')
  }

  const days = calculateDays(reservation.startDay)

  if (reservation.isPaid || days <= 3) {
    throw new ApiError(
      400,
      'Can not delete reservation; reservation is paid or or there is less than 3 days to start the stay in the hotel'
    )
  }

  return reservation
}
