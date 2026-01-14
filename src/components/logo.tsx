"use client"

import * as React from "react"
import { motion, type HTMLMotionProps } from "motion/react"

interface MergedShapeProps extends HTMLMotionProps<"div"> {
  fill?: string
  children?: React.ReactNode
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

const shapeVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 20,
    },
  },
}

const bridgeVariants = {
  hidden: { opacity: 0, scale: 0 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 25,
    },
  },
}

const MergedShape = ({
  fill = "#ffffff",
  children,
  style: containerStyle,
  className,
  ...props
}: MergedShapeProps) => (
  <motion.div
    style={{
      position: "relative",
      width: 440,
      height: 460,
      ...containerStyle,
    }}
    className={className}
    variants={containerVariants}
    initial="hidden"
    animate="visible"
    {...props}
  >
    {/* Shape 1 */}
    <motion.div
      variants={shapeVariants}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 120,
        height: 460,
        backgroundColor: fill,
        borderRadius: "32px 32px 32px 32px",
      }}
    />
    {/* Shape 2 */}
    <motion.div
      variants={shapeVariants}
      style={{
        position: "absolute",
        left: 320,
        top: 0,
        width: 120,
        height: 460,
        backgroundColor: fill,
        borderRadius: "32px 32px 32px 32px",
      }}
    />
    {/* Shape 3 */}
    <motion.div
      variants={shapeVariants}
      style={{
        position: "absolute",
        left: 190,
        top: 60,
        width: 60,
        height: 70,
        backgroundColor: fill,
        borderRadius: "0px 0px 32px 32px",
      }}
    />
    {/* Shape 4 */}
    <motion.div
      variants={shapeVariants}
      style={{
        position: "absolute",
        left: 70,
        top: 0,
        width: 120,
        height: 80,
        backgroundColor: fill,
        borderRadius: "32px 32px 0px 32px",
      }}
    />
    {/* Shape 5 */}
    <motion.div
      variants={shapeVariants}
      style={{
        position: "absolute",
        left: 250,
        top: 0,
        width: 120,
        height: 80,
        backgroundColor: fill,
        borderRadius: "32px 32px 32px 0px",
      }}
    />
    <motion.div
      variants={shapeVariants}
      style={{
        position: "absolute",
        left: 120,
        top: 80,
        width: 70,
        height: 380,
      }}
    />
    <motion.div
      variants={shapeVariants}
      style={{
        position: "absolute",
        left: 250,
        top: 80,
        width: 70,
        height: 380,
      }}
    />
    <motion.div
      variants={shapeVariants}
      style={{
        position: "absolute",
        left: 190,
        top: 0,
        width: 60,
        height: 60,
      }}
    />
    {/* Bridge 1 */}
    <motion.svg
      variants={bridgeVariants}
      style={{
        position: "absolute",
        left: 158,
        top: 80,
        width: 32,
        height: 32,
        pointerEvents: "none",
      }}
      viewBox="-32 -32 32 32"
    >
      <path d="M 0 0 C 0 -23.872 -5.76 -32 -32 -32 H 0 Z" fill={fill} />
    </motion.svg>
    {/* Bridge 2 */}
    <motion.svg
      variants={bridgeVariants}
      style={{
        position: "absolute",
        left: 250,
        top: 80,
        width: 32,
        height: 32,
        pointerEvents: "none",
      }}
      viewBox="0 -32 32 32"
    >
      <path d="M 0 0 C 0 -23.872 5.76 -32 32 -32 H 0 Z" fill={fill} />
    </motion.svg>
    {/* Bridge 3 */}
    <motion.svg
      variants={bridgeVariants}
      style={{
        position: "absolute",
        left: 190,
        top: 28,
        width: 32,
        height: 32,
        pointerEvents: "none",
      }}
      viewBox="0 0 32 32"
    >
      <path d="M 0 0 C 0 23.872 5.76 32 32 32 H 0 Z" fill={fill} />
    </motion.svg>
    {/* Bridge 4 */}
    <motion.svg
      variants={bridgeVariants}
      style={{
        position: "absolute",
        left: 218,
        top: 28,
        width: 32,
        height: 32,
        pointerEvents: "none",
      }}
      viewBox="-32 0 32 32"
    >
      <path d="M 0 0 C 0 23.872 -5.76 32 -32 32 H 0 Z" fill={fill} />
    </motion.svg>
    {children}
  </motion.div>
)

export default MergedShape
