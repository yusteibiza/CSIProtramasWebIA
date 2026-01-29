-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 192.168.250.4    Database: csiprogramaswebia
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `aplicacioncliente`
--

DROP DATABASE `csiprogramaswebia`;
CREATE DATABASE `csiprogramaswebia`;
USE `csiprogramaswebia`;

DROP TABLE IF EXISTS `aplicacioncliente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `aplicacioncliente` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `IDCliente` int DEFAULT NULL,
  `IDAplicacion` int DEFAULT NULL,
  `Version` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `IDDesarrollo` int DEFAULT NULL,
  `IDPlataforma` int DEFAULT NULL,
  `Licencias` int DEFAULT NULL,
  `Contrato` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `VersionEspecial` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Notas` text COLLATE utf8mb4_unicode_ci,
  `NotasHTML` text COLLATE utf8mb4_unicode_ci,
  `Clave` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`ID`),
  KEY `IX_Clave` (`Clave`),
  KEY `IDCliente` (`IDCliente`),
  KEY `IDAplicacion` (`IDAplicacion`),
  KEY `IDDesarrollo` (`IDDesarrollo`),
  KEY `IDPlataforma` (`IDPlataforma`),
  CONSTRAINT `aplicacioncliente_ibfk_1` FOREIGN KEY (`IDCliente`) REFERENCES `clientes` (`ID`) ON DELETE RESTRICT,
  CONSTRAINT `aplicacioncliente_ibfk_2` FOREIGN KEY (`IDAplicacion`) REFERENCES `aplicaciones` (`ID`) ON DELETE RESTRICT,
  CONSTRAINT `aplicacioncliente_ibfk_3` FOREIGN KEY (`IDDesarrollo`) REFERENCES `desarrollos` (`ID`) ON DELETE RESTRICT,
  CONSTRAINT `aplicacioncliente_ibfk_4` FOREIGN KEY (`IDPlataforma`) REFERENCES `plataformas` (`ID`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `aplicaciones`
--

DROP TABLE IF EXISTS `aplicaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `aplicaciones` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `Codigo` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Nombre` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `aplicacionesexcel`
--

DROP TABLE IF EXISTS `aplicacionesexcel`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `aplicacionesexcel` (
  `APLICACIONES_CSI` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `F2` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `F3` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `F4` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `F5` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `F6` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `F7` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `Codigo` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `NombreComercial` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `NombreFiscal` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `TipoCliente` int DEFAULT NULL,
  `FechaAlta` date DEFAULT NULL,
  `NombreContacto` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `NIF` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Direccion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `CodigoPostal` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Poblacion` int DEFAULT NULL,
  `Provincia` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Telefono1` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Telefono2` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `TelefonoMovil` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Fax` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Observaciones` text COLLATE utf8mb4_unicode_ci,
  `Activo` tinyint(1) DEFAULT '1',
  `DireccionIP` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`ID`),
  KEY `TipoCliente` (`TipoCliente`),
  KEY `Poblacion` (`Poblacion`),
  CONSTRAINT `clientes_ibfk_1` FOREIGN KEY (`TipoCliente`) REFERENCES `tiposclientes` (`ID`) ON DELETE RESTRICT,
  CONSTRAINT `clientes_ibfk_2` FOREIGN KEY (`Poblacion`) REFERENCES `poblaciones` (`ID`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=261 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clientesexcel`
--

DROP TABLE IF EXISTS `clientesexcel`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientesexcel` (
  `Codigo` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `NomComercial` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `NomFiscal` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `DNI` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `conexioncliente`
--

DROP TABLE IF EXISTS `conexioncliente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conexioncliente` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `IDCliente` int DEFAULT NULL,
  `IDTipoConexion` int DEFAULT NULL,
  `Activo` tinyint(1) DEFAULT '1',
  `Nombre` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Puerto` int DEFAULT NULL,
  `Usuario` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Password` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Notas` text COLLATE utf8mb4_unicode_ci,
  `DireccionIP` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Clave` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`ID`),
  KEY `IX_Clave` (`Clave`),
  KEY `IDCliente` (`IDCliente`),
  KEY `IDTipoConexion` (`IDTipoConexion`),
  CONSTRAINT `conexioncliente_ibfk_1` FOREIGN KEY (`IDCliente`) REFERENCES `clientes` (`ID`) ON DELETE RESTRICT,
  CONSTRAINT `conexioncliente_ibfk_2` FOREIGN KEY (`IDTipoConexion`) REFERENCES `tiposconexiones` (`ID`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cuentascorreo`
--

DROP TABLE IF EXISTS `cuentascorreo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cuentascorreo` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `Codigo` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Nombre` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Direccion` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Usuario` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Password` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `POP` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `SMTP` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `PuertoPOP` int DEFAULT NULL,
  `PuertoSMTP` int DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `desarrollos`
--

DROP TABLE IF EXISTS `desarrollos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `desarrollos` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `Codigo` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Nombre` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `documentacion`
--

DROP TABLE IF EXISTS `documentacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documentacion` (
  `IDDocumentacion` int NOT NULL AUTO_INCREMENT,
  `IDCliente` int DEFAULT NULL,
  `NombreArchivo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Descripcion` text COLLATE utf8mb4_unicode_ci,
  `Buffer` longblob,
  `TamArchivo` int DEFAULT NULL,
  `FechaSubida` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`IDDocumentacion`),
  KEY `IX_IDCliNomArch` (`IDCliente`,`NombreArchivo`),
  CONSTRAINT `documentacion_ibfk_1` FOREIGN KEY (`IDCliente`) REFERENCES `clientes` (`ID`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `equipos`
--

DROP TABLE IF EXISTS `equipos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `equipos` (
  `IDEquipos` int NOT NULL AUTO_INCREMENT,
  `IDCliente` int DEFAULT NULL,
  `NombreEquipo` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Fecha` date DEFAULT NULL,
  `PlacaBase` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `CPU` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Memoria` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Grafica` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Unidades` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `IP` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Notas` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`IDEquipos`),
  KEY `IX_IDClienteNombreEquipo` (`IDCliente`,`NombreEquipo`),
  CONSTRAINT `equipos_ibfk_1` FOREIGN KEY (`IDCliente`) REFERENCES `clientes` (`ID`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notasusuarios`
--

DROP TABLE IF EXISTS `notasusuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notasusuarios` (
  `IDNotasUsuarios` int NOT NULL AUTO_INCREMENT,
  `IDUsuario` int DEFAULT NULL,
  `Nota` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`IDNotasUsuarios`),
  KEY `IDUsuario` (`IDUsuario`),
  CONSTRAINT `notasusuarios_ibfk_1` FOREIGN KEY (`IDUsuario`) REFERENCES `usuarios` (`IDAcceso`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `plataformas`
--

DROP TABLE IF EXISTS `plataformas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plataformas` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `Codigo` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Nombre` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `poblaciones`
--

DROP TABLE IF EXISTS `poblaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `poblaciones` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `Codigo` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Nombre` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `remitentes`
--

DROP TABLE IF EXISTS `remitentes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `remitentes` (
  `IDRemitentes` int NOT NULL AUTO_INCREMENT,
  `Nombre` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Remitente` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ServidorSMTP` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Usuario` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Password` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Puerto` int DEFAULT NULL,
  `Autenticacion` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`IDRemitentes`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `soporte`
--

DROP TABLE IF EXISTS `soporte`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `soporte` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `Codigo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Cliente` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Asunto` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Descripcion` text COLLATE utf8mb4_unicode_ci,
  `Estado` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Abierto',
  `Prioridad` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Media',
  `Fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID`),
  UNIQUE KEY `Codigo` (`Codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tiposclientes`
--

DROP TABLE IF EXISTS `tiposclientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tiposclientes` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `Codigo` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Nombre` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tiposconexiones`
--

DROP TABLE IF EXISTS `tiposconexiones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tiposconexiones` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `Codigo` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Nombre` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `IDAcceso` int NOT NULL AUTO_INCREMENT,
  `Usuario` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Imagen` longblob,
  PRIMARY KEY (`IDAcceso`),
  UNIQUE KEY `Usuario` (`Usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-29 23:40:40
